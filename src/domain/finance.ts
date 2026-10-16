import { prisma } from "@/lib/prisma";
import { logSecurityAudit } from "@/domain/security";
import { nextInvoiceNumber } from "@/domain/billing";
import {
  buildInvoiceLinesByMonth,
  invoiceTotals,
  normaliseLine,
  periodLabelFor,
} from "@/domain/invoice-lines";

/**
 * Finance workspace (Kaseya BMS-style "Ready to bill" flow):
 * technicians log time → a lead approves it → finance reviews, writes off or invoices it → Xero.
 */

function monthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/** Approved, billable time that has not made it onto a (non-void) invoice yet. */
const unbilledTimeWhere = (tenantId: string) => ({
  tenantId,
  status: "approved",
  isBillable: true,
  OR: [
    { billingPeriodId: null },
    { billingPeriod: { invoices: { none: { status: { not: "void" } } } } },
  ],
});

const contractPricingInclude = { rateCard: { include: { lines: true } } } as const;

async function retainerBilledThisMonth(tenantId: string, contractId: string) {
  const { start } = monthBounds();
  const invoice = await prisma.invoice.findFirst({
    where: {
      tenantId,
      contractId,
      status: { not: "void" },
      createdAt: { gte: start },
      lines: { some: { lineType: "retainer" } },
    },
    select: { id: true },
  });
  return Boolean(invoice);
}

export async function getReadyToBill(tenantId: string) {
  const [entries, awaitingApproval, retainers] = await Promise.all([
    prisma.timeEntry.findMany({
      where: unbilledTimeWhere(tenantId),
      include: {
        ticket: { select: { id: true, ticketNumber: true, subject: true } },
        user: { select: { name: true } },
        workType: { select: { name: true } },
        organisation: { select: { id: true, name: true } },
        contract: { include: contractPricingInclude },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.timeEntry.aggregate({
      where: { tenantId, status: "submitted", isBillable: true },
      _count: true,
      _sum: { durationMinutes: true },
    }),
    prisma.contract.findMany({
      where: { tenantId, status: "active", contractType: "retainer", retainerAmount: { not: null } },
      include: { ...contractPricingInclude, organisation: { select: { id: true, name: true } } },
    }),
  ]);

  type Entry = (typeof entries)[number];
  const groups = new Map<
    string,
    {
      key: string;
      organisation: { id: string; name: string };
      contract: Entry["contract"];
      entries: Entry[];
    }
  >();

  for (const e of entries) {
    const key = e.contractId ?? `none:${e.organisationId}`;
    const group = groups.get(key) ?? { key, organisation: e.organisation, contract: e.contract, entries: [] };
    group.entries.push(e);
    groups.set(key, group);
  }

  for (const r of retainers) {
    if (!groups.has(r.id)) {
      groups.set(r.id, { key: r.id, organisation: r.organisation, contract: r, entries: [] });
    }
  }

  const result = await Promise.all(
    [...groups.values()].map(async (g) => {
      const minutes = g.entries.reduce((s, e) => s + e.durationMinutes, 0);
      const first = g.entries[0]?.createdAt ?? monthBounds().start;
      const last = g.entries.at(-1)?.createdAt ?? new Date();
      const label = periodLabelFor(first, last);
      const retainerDue =
        g.contract?.contractType === "retainer" &&
        g.contract.retainerAmount != null &&
        !(await retainerBilledThisMonth(tenantId, g.contract.id));
      const lines = g.contract
        ? buildInvoiceLinesByMonth(g.contract, label, g.entries, {
          includeRetainer: retainerDue,
          retainerLabel: periodLabelFor(monthBounds().start, monthBounds().start),
        })
        : [];
      const billable = lines.filter((l) => l.lineType !== "info");
      return {
        key: g.key,
        organisation: g.organisation,
        contract: g.contract
          ? {
              id: g.contract.id,
              name: g.contract.name,
              contractType: g.contract.contractType,
              currency: g.contract.currency,
              monthlyMinutes: g.contract.monthlyMinutes,
            }
          : null,
        label,
        minutes,
        retainerDue,
        lines: billable,
        estimate: invoiceTotals(billable).subtotal,
        entries: g.entries.map((e) => ({
          id: e.id,
          createdAt: e.createdAt.toISOString(),
          durationMinutes: e.durationMinutes,
          notes: e.notes,
          technician: e.user.name,
          workType: e.workType?.name ?? null,
          ticket: e.ticket,
        })),
      };
    })
  );

  // Hide retainers with nothing to bill (already invoiced this month and no new time).
  const actionable = result.filter((g) => g.entries.length > 0 || g.retainerDue);
  actionable.sort((a, b) => a.organisation.name.localeCompare(b.organisation.name));

  return {
    groups: actionable,
    awaitingApproval: {
      count: awaitingApproval._count,
      minutes: awaitingApproval._sum.durationMinutes ?? 0,
    },
  };
}

export async function createInvoiceFromReview(tenantId: string, contractId: string, actorId: string) {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, tenantId },
    include: contractPricingInclude,
  });
  if (!contract) throw new Error("Contract not found");

  const entries = await prisma.timeEntry.findMany({
    where: { ...unbilledTimeWhere(tenantId), contractId },
    include: { workType: true },
    orderBy: { createdAt: "asc" },
  });
  const retainerDue =
    contract.contractType === "retainer" &&
    contract.retainerAmount != null &&
    !(await retainerBilledThisMonth(tenantId, contractId));

  if (entries.length === 0 && !retainerDue) throw new Error("Nothing to bill for this contract");

  const month = monthBounds();
  const startDate = entries[0]?.createdAt ?? month.start;
  const endDate = entries.at(-1)?.createdAt ?? month.end;
  const label = periodLabelFor(startDate, endDate);
  const lines = buildInvoiceLinesByMonth(contract, label, entries, {
          includeRetainer: retainerDue,
          retainerLabel: periodLabelFor(monthBounds().start, monthBounds().start),
        });
  const totals = invoiceTotals(lines);
  const invoiceNumber = await nextInvoiceNumber(tenantId);

  const invoice = await prisma.$transaction(async (tx) => {
    const period = await tx.billingPeriod.create({
      data: {
        tenantId,
        organisationId: contract.organisationId,
        contractId,
        label,
        startDate,
        endDate,
        status: "closed",
        closedAt: new Date(),
      },
    });
    if (entries.length > 0) {
      await tx.timeEntry.updateMany({
        where: { id: { in: entries.map((e) => e.id) } },
        data: { billingPeriodId: period.id },
      });
    }
    return tx.invoice.create({
      data: {
        tenantId,
        organisationId: contract.organisationId,
        contractId,
        billingPeriodId: period.id,
        invoiceNumber,
        status: "draft",
        currency: contract.currency,
        ...totals,
        notes: `Created from billing review (${label})`,
        lines: { create: lines },
      },
    });
  });

  await logSecurityAudit({
    tenantId,
    actorId,
    action: "invoice.created",
    targetType: "invoice",
    targetId: invoice.id,
    detail: { invoiceNumber, contractId, entries: entries.length, total: invoice.total },
  });
  return invoice;
}

export async function writeOffTimeEntry(tenantId: string, entryId: string, actorId: string, reason: string) {
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("A reason is required to write off time");

  const entry = await prisma.timeEntry.findFirst({ where: { ...unbilledTimeWhere(tenantId), id: entryId } });
  if (!entry) throw new Error("Time entry not found or already invoiced");

  const updated = await prisma.timeEntry.update({ where: { id: entryId }, data: { isBillable: false } });
  await logSecurityAudit({
    tenantId,
    actorId,
    action: "time.write_off",
    targetType: "time_entry",
    targetId: entryId,
    detail: { reason: trimmed, minutes: entry.durationMinutes, ticketId: entry.ticketId },
  });
  return updated;
}

export async function updateDraftInvoiceLines(
  tenantId: string,
  invoiceId: string,
  rawLines: unknown[],
  actorId: string
) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "draft") throw new Error("Only draft invoices can be edited");
  if (!Array.isArray(rawLines) || rawLines.length === 0) throw new Error("An invoice needs at least one line");

  const lines = rawLines.map((l) => normaliseLine(l as Parameters<typeof normaliseLine>[0]));
  const totals = invoiceTotals(lines);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.invoiceLine.deleteMany({ where: { invoiceId } });
    return tx.invoice.update({
      where: { id: invoiceId },
      data: { ...totals, lines: { create: lines } },
      include: { lines: true },
    });
  });

  await logSecurityAudit({
    tenantId,
    actorId,
    action: "invoice.lines_edited",
    targetType: "invoice",
    targetId: invoiceId,
    detail: { before: invoice.total, after: updated.total },
  });
  return updated;
}

export async function getFinanceInvoice(tenantId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: {
      organisation: { select: { id: true, name: true, billingEmail: true, paymentTerms: true, xeroContactId: true } },
      contract: { select: { id: true, name: true, contractType: true } },
      billingPeriod: {
        include: {
          timeEntries: {
            include: {
              ticket: { select: { id: true, ticketNumber: true, subject: true } },
              user: { select: { name: true } },
              workType: { select: { name: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      lines: true,
    },
  });
  return invoice;
}

export async function listFinanceContracts(tenantId: string) {
  const { start, end } = monthBounds();
  const contracts = await prisma.contract.findMany({
    where: { tenantId },
    include: { organisation: { select: { id: true, name: true } }, rateCard: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { organisation: { name: "asc" } }],
  });
  const usage = await prisma.timeEntry.groupBy({
    by: ["contractId"],
    where: {
      tenantId,
      isBillable: true,
      status: { in: ["submitted", "approved"] },
      createdAt: { gte: start, lte: end },
      contractId: { in: contracts.map((c) => c.id) },
    },
    _sum: { durationMinutes: true },
  });
  const usedByContract = new Map(usage.map((u) => [u.contractId, u._sum.durationMinutes ?? 0]));
  const renewalWindow = Date.now() + 60 * 24 * 60 * 60 * 1000;

  return contracts.map((c) => ({
    id: c.id,
    name: c.name,
    organisation: c.organisation,
    contractType: c.contractType,
    status: c.status,
    currency: c.currency,
    retainerAmount: c.retainerAmount,
    overageHourlyRate: c.overageHourlyRate,
    monthlyMinutes: c.monthlyMinutes,
    usedMinutes: usedByContract.get(c.id) ?? 0,
    rateCard: c.rateCard?.name ?? null,
    startDate: c.startDate.toISOString(),
    endDate: c.endDate?.toISOString() ?? null,
    renewalDue: c.status === "active" && c.endDate != null && c.endDate.getTime() <= renewalWindow,
  }));
}

export async function getFinanceReport(tenantId: string) {
  const now = new Date();
  const month = monthBounds(now);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [review, invoices, nonBillable, contracts] = await Promise.all([
    getReadyToBill(tenantId),
    prisma.invoice.findMany({
      where: { tenantId, createdAt: { gte: new Date(Math.min(yearStart.getTime(), sixMonthsAgo.getTime())) } },
      select: {
        status: true,
        subtotal: true,
        createdAt: true,
        currency: true,
        organisation: { select: { id: true, name: true } },
      },
    }),
    prisma.timeEntry.aggregate({
      where: { tenantId, status: "approved", isBillable: false, createdAt: { gte: month.start, lte: month.end } },
      _sum: { durationMinutes: true },
      _count: true,
    }),
    listFinanceContracts(tenantId),
  ]);

  const counted = invoices.filter((i) => i.status === "approved");
  const sum = (list: typeof invoices) => Math.round(list.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return {
      label: d.toLocaleString("en", { month: "short" }),
      total: sum(counted.filter((inv) => inv.createdAt >= d && inv.createdAt < next)),
    };
  });

  const byAccount = new Map<string, { id: string; name: string; total: number; invoices: number }>();
  for (const inv of counted.filter((i) => i.createdAt >= yearStart)) {
    const row = byAccount.get(inv.organisation.id) ?? { ...inv.organisation, total: 0, invoices: 0 };
    row.total = Math.round((row.total + inv.subtotal) * 100) / 100;
    row.invoices += 1;
    byAccount.set(inv.organisation.id, row);
  }

  const drafts = invoices.filter((i) => i.status === "draft");

  return {
    currency: invoices[0]?.currency ?? "NZD",
    unbilled: {
      value: Math.round(review.groups.reduce((s, g) => s + g.estimate, 0) * 100) / 100,
      minutes: review.groups.reduce((s, g) => s + g.minutes, 0),
      accounts: new Set(review.groups.map((g) => g.organisation.id)).size,
    },
    awaitingApproval: review.awaitingApproval,
    invoicedThisMonth: sum(counted.filter((i) => i.createdAt >= month.start)),
    invoicedYtd: sum(counted.filter((i) => i.createdAt >= yearStart)),
    drafts: { count: drafts.length, value: sum(drafts) },
    nonBillableThisMonth: { minutes: nonBillable._sum.durationMinutes ?? 0, entries: nonBillable._count },
    months,
    revenueByAccount: [...byAccount.values()].sort((a, b) => b.total - a.total),
    utilisation: contracts
      .filter((c) => c.status === "active" && c.monthlyMinutes)
      .map((c) => ({
        id: c.id,
        name: c.name,
        organisation: c.organisation.name,
        usedMinutes: c.usedMinutes,
        allowanceMinutes: c.monthlyMinutes!,
      }))
      .sort((a, b) => b.usedMinutes / b.allowanceMinutes - a.usedMinutes / a.allowanceMinutes),
  };
}

/** Billing-only view of a ticket: no conversation or internal notes. */
export async function getTicketBillingSummary(tenantId: string, ticketId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, tenantId, deletedAt: null },
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      createdAt: true,
      resolvedAt: true,
      organisation: { select: { id: true, name: true } },
      contact: { select: { name: true } },
      assignee: { select: { name: true } },
      status: { select: { name: true, code: true, category: true } },
      priority: { select: { name: true } },
      ticketType: { select: { name: true } },
      timeEntries: {
        select: {
          id: true,
          createdAt: true,
          durationMinutes: true,
          isBillable: true,
          status: true,
          notes: true,
          user: { select: { name: true } },
          workType: { select: { name: true } },
          contract: { select: { name: true } },
          billingPeriod: {
            select: {
              invoices: {
                where: { status: { not: "void" } },
                select: { id: true, invoiceNumber: true, status: true },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return ticket;
}
