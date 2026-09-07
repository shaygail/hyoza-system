import { prisma } from "@/lib/prisma";
import { getContractUsage } from "@/domain/contracts";

async function nextInvoiceNumber(tenantId: string) {
  const count = await prisma.invoice.count({ where: { tenantId } });
  return `INV-${String(count + 1).padStart(5, "0")}`;
}

export async function listBillingPeriods(tenantId: string, filters?: { contractId?: string; status?: string }) {
  return prisma.billingPeriod.findMany({
    where: {
      tenantId,
      ...(filters?.contractId ? { contractId: filters.contractId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
    include: {
      organisation: { select: { id: true, name: true } },
      contract: { select: { id: true, name: true, contractType: true } },
      _count: { select: { timeEntries: true, invoices: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

export async function openBillingPeriod(
  tenantId: string,
  data: { contractId: string; label?: string; startDate: string; endDate: string }
) {
  const contract = await prisma.contract.findFirst({
    where: { id: data.contractId, tenantId },
  });
  if (!contract) throw new Error("Contract not found");

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const label =
    data.label ??
    `${start.toLocaleString("en", { month: "short" })} ${start.getFullYear()}`;

  const period = await prisma.billingPeriod.create({
    data: {
      tenantId,
      organisationId: contract.organisationId,
      contractId: contract.id,
      label,
      startDate: start,
      endDate: end,
      status: "open",
    },
  });

  await prisma.timeEntry.updateMany({
    where: {
      tenantId,
      contractId: contract.id,
      billingPeriodId: null,
      status: "approved",
      isBillable: true,
      createdAt: { gte: start, lte: end },
    },
    data: { billingPeriodId: period.id },
  });

  return prisma.billingPeriod.findUnique({
    where: { id: period.id },
    include: {
      organisation: true,
      contract: true,
      timeEntries: true,
    },
  });
}

export async function closeBillingPeriod(tenantId: string, periodId: string) {
  const period = await prisma.billingPeriod.findFirst({
    where: { id: periodId, tenantId },
  });
  if (!period) throw new Error("Billing period not found");
  if (period.status === "closed") throw new Error("Period already closed");

  return prisma.billingPeriod.update({
    where: { id: periodId },
    data: { status: "closed", closedAt: new Date() },
  });
}

export async function listInvoices(tenantId: string, filters?: { organisationId?: string; status?: string }) {
  return prisma.invoice.findMany({
    where: {
      tenantId,
      ...(filters?.organisationId ? { organisationId: filters.organisationId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
    include: {
      organisation: { select: { id: true, name: true, billingEmail: true } },
      contract: { select: { id: true, name: true } },
      billingPeriod: { select: { id: true, label: true } },
      lines: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoice(tenantId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { id, tenantId },
    include: {
      organisation: true,
      contract: true,
      billingPeriod: true,
      lines: true,
    },
  });
}

export async function generateInvoiceDraft(tenantId: string, billingPeriodId: string) {
  const period = await prisma.billingPeriod.findFirst({
    where: { id: billingPeriodId, tenantId },
    include: {
      contract: { include: { rateCard: { include: { lines: true } } } },
      timeEntries: { include: { workType: true } },
      organisation: true,
    },
  });
  if (!period) throw new Error("Billing period not found");

  const existing = await prisma.invoice.findFirst({
    where: { billingPeriodId, status: { not: "void" } },
  });
  if (existing) throw new Error("An invoice already exists for this period");

  const contract = period.contract;
  const lines: { description: string; quantity: number; unitAmount: number; lineTotal: number; lineType: string }[] = [];

  if (contract.contractType === "retainer" && contract.retainerAmount != null) {
    lines.push({
      description: `Monthly retainer — ${period.label}`,
      quantity: 1,
      unitAmount: contract.retainerAmount,
      lineTotal: contract.retainerAmount,
      lineType: "retainer",
    });
  }

  const rateMap = new Map(
    (contract.rateCard?.lines ?? []).map((l) => [l.workTypeId, l.hourlyRate])
  );
  const defaultRate = contract.overageHourlyRate ?? 150;

  const approvedBillable = period.timeEntries.filter((e) => e.isBillable && e.status === "approved");
  const totalMinutes = approvedBillable.reduce((s, e) => s + e.durationMinutes, 0);

  if (contract.contractType === "block_hours") {
    const allowance = contract.monthlyMinutes ?? 0;
    const overageMinutes = Math.max(0, totalMinutes - allowance);
    if (overageMinutes > 0) {
      const hours = overageMinutes / 60;
      const rate = defaultRate;
      lines.push({
        description: `Block hours overage (${overageMinutes}m beyond ${allowance}m)`,
        quantity: Math.round(hours * 100) / 100,
        unitAmount: rate,
        lineTotal: Math.round(hours * rate * 100) / 100,
        lineType: "overage",
      });
    } else if (totalMinutes > 0) {
      lines.push({
        description: `Included block hours usage (${totalMinutes}m of ${allowance}m)`,
        quantity: 0,
        unitAmount: 0,
        lineTotal: 0,
        lineType: "included",
      });
    }
  } else if (contract.contractType === "tm" || contract.contractType === "retainer") {
    const byType = new Map<string, { minutes: number; name: string; rate: number }>();
    for (const entry of approvedBillable) {
      const key = entry.workTypeId ?? "default";
      const rate = entry.workTypeId ? rateMap.get(entry.workTypeId) ?? defaultRate : defaultRate;
      const existingLine = byType.get(key) ?? {
        minutes: 0,
        name: entry.workType?.name ?? "General",
        rate,
      };
      existingLine.minutes += entry.durationMinutes;
      byType.set(key, existingLine);
    }

    for (const [, group] of byType) {
      const hours = group.minutes / 60;
      const amount = Math.round(hours * group.rate * 100) / 100;
      if (contract.contractType === "retainer") {
        // Retainer already billed; T&M lines only for visibility of usage at $0 unless overage configured
        continue;
      }
      lines.push({
        description: `Time & materials — ${group.name}`,
        quantity: Math.round(hours * 100) / 100,
        unitAmount: group.rate,
        lineTotal: amount,
        lineType: "time",
      });
    }

    if (contract.contractType === "retainer" && contract.monthlyMinutes != null) {
      const overageMinutes = Math.max(0, totalMinutes - contract.monthlyMinutes);
      if (overageMinutes > 0) {
        const hours = overageMinutes / 60;
        const rate = defaultRate;
        lines.push({
          description: `Retainer overage (${overageMinutes}m)`,
          quantity: Math.round(hours * 100) / 100,
          unitAmount: rate,
          lineTotal: Math.round(hours * rate * 100) / 100,
          lineType: "overage",
        });
      }
    }
  }

  if (lines.length === 0) {
    lines.push({
      description: `No billable charges for ${period.label}`,
      quantity: 0,
      unitAmount: 0,
      lineTotal: 0,
      lineType: "info",
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const taxAmount = Math.round(subtotal * 0.15 * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const invoiceNumber = await nextInvoiceNumber(tenantId);

  return prisma.invoice.create({
    data: {
      tenantId,
      organisationId: period.organisationId,
      contractId: period.contractId,
      billingPeriodId: period.id,
      invoiceNumber,
      status: "draft",
      currency: contract.currency,
      subtotal,
      taxAmount,
      total,
      notes: `Generated from billing period ${period.label}`,
      lines: {
        create: lines,
      },
    },
    include: { lines: true, organisation: true, contract: true, billingPeriod: true },
  });
}

export async function updateInvoiceStatus(
  tenantId: string,
  invoiceId: string,
  status: "draft" | "approved" | "void"
) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } });
  if (!invoice) throw new Error("Invoice not found");

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      issuedAt: status === "approved" ? new Date() : invoice.issuedAt,
    },
    include: { lines: true, organisation: true },
  });
}

export function invoiceToCsv(invoice: {
  invoiceNumber: string;
  organisation: { name: string };
  currency: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  lines: { description: string; quantity: number; unitAmount: number; lineTotal: number }[];
}) {
  const rows = [
    ["Invoice", invoice.invoiceNumber],
    ["Account", invoice.organisation.name],
    ["Currency", invoice.currency],
    [],
    ["Description", "Quantity", "Unit Amount", "Line Total"],
    ...invoice.lines.map((l) => [
      l.description,
      String(l.quantity),
      String(l.unitAmount),
      String(l.lineTotal),
    ]),
    [],
    ["Subtotal", "", "", String(invoice.subtotal)],
    ["Tax", "", "", String(invoice.taxAmount)],
    ["Total", "", "", String(invoice.total)],
  ];
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export async function getContractUsageForPeriod(tenantId: string, contractId: string) {
  return getContractUsage(tenantId, contractId);
}
