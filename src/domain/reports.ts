import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export interface ReportFilters {
  from?: Date;
  to?: Date;
  organisationId?: string;
}

export async function getTicketVolumeReport(tenantId: string, filters: ReportFilters = {}) {
  const where: Record<string, unknown> = { tenantId, deletedAt: null };
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) (where.createdAt as Record<string, Date>).gte = filters.from;
    if (filters.to) (where.createdAt as Record<string, Date>).lte = filters.to;
  }
  if (filters.organisationId) where.organisationId = filters.organisationId;

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      status: true,
      priority: true,
      ticketType: true,
      organisation: true,
    },
  });

  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byOrg: Record<string, number> = {};

  for (const t of tickets) {
    byStatus[t.status.name] = (byStatus[t.status.name] ?? 0) + 1;
    byPriority[t.priority.name] = (byPriority[t.priority.name] ?? 0) + 1;
    byType[t.ticketType.name] = (byType[t.ticketType.name] ?? 0) + 1;
    byOrg[t.organisation.name] = (byOrg[t.organisation.name] ?? 0) + 1;
  }

  return {
    total: tickets.length,
    byStatus,
    byPriority,
    byType,
    byOrganisation: byOrg,
  };
}

export async function getSlaComplianceReport(tenantId: string, filters: ReportFilters = {}) {
  const where: Record<string, unknown> = {
    tenantId,
    deletedAt: null,
    resolutionDueAt: { not: null },
  };
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) (where.createdAt as Record<string, Date>).gte = filters.from;
    if (filters.to) (where.createdAt as Record<string, Date>).lte = filters.to;
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: { organisation: true, priority: true },
  });

  let met = 0;
  let breached = 0;
  let pending = 0;

  for (const t of tickets) {
    if (!t.resolvedAt && !t.closedAt) {
      pending++;
      continue;
    }
    const resolvedAt = t.resolvedAt ?? t.closedAt!;
    if (t.resolutionDueAt && resolvedAt <= t.resolutionDueAt) {
      met++;
    } else {
      breached++;
    }
  }

  const total = met + breached;
  return {
    met,
    breached,
    pending,
    complianceRate: total > 0 ? Math.round((met / total) * 100) : 100,
    tickets: tickets.map((t) => ({
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      organisation: t.organisation.name,
      priority: t.priority.name,
      resolutionDueAt: t.resolutionDueAt,
      resolvedAt: t.resolvedAt ?? t.closedAt,
      met:
        t.resolvedAt || t.closedAt
          ? (t.resolvedAt ?? t.closedAt!) <= (t.resolutionDueAt ?? new Date())
          : null,
    })),
  };
}

export async function getTimeReport(tenantId: string, filters: ReportFilters = {}) {
  const where: Record<string, unknown> = { tenantId };
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) (where.createdAt as Record<string, Date>).gte = filters.from;
    if (filters.to) (where.createdAt as Record<string, Date>).lte = filters.to;
  }
  if (filters.organisationId) where.organisationId = filters.organisationId;

  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      user: { select: { name: true } },
      organisation: { select: { name: true } },
      workType: { select: { name: true } },
      ticket: { select: { ticketNumber: true, subject: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
  const byUser: Record<string, number> = {};
  const byOrg: Record<string, number> = {};

  for (const e of entries) {
    byUser[e.user.name] = (byUser[e.user.name] ?? 0) + e.durationMinutes;
    byOrg[e.organisation.name] = (byOrg[e.organisation.name] ?? 0) + e.durationMinutes;
  }

  return { totalMinutes, byUser, byOrganisation: byOrg, entries };
}

export function exportToCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

export async function exportTicketsCsv(tenantId: string, filters: ReportFilters = {}) {
  const where: Record<string, unknown> = { tenantId, deletedAt: null };
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) (where.createdAt as Record<string, Date>).gte = filters.from;
    if (filters.to) (where.createdAt as Record<string, Date>).lte = filters.to;
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      organisation: true,
      status: true,
      priority: true,
      ticketType: true,
      assignee: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = tickets.map((t) => [
    t.ticketNumber,
    t.subject,
    t.organisation.name,
    t.status.name,
    t.priority.name,
    t.ticketType.name,
    t.assignee?.name ?? "",
    format(t.createdAt, "yyyy-MM-dd HH:mm"),
    t.resolvedAt ? format(t.resolvedAt, "yyyy-MM-dd HH:mm") : "",
  ]);

  return exportToCsv(
    ["Ticket", "Subject", "Organisation", "Status", "Priority", "Type", "Assignee", "Created", "Resolved"],
    rows
  );
}

function monthBounds(yearMonth: string) {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  if (!year || month < 0 || month > 11) throw new Error("Invalid month. Use YYYY-MM.");
  const from = new Date(year, month, 1, 0, 0, 0, 0);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { from, to, label: format(from, "MMMM yyyy") };
}

export async function getMonthlyAccountReport(
  tenantId: string,
  yearMonth: string,
  organisationId?: string
) {
  const { from, to, label } = monthBounds(yearMonth);

  const orgs = await prisma.organisation.findMany({
    where: {
      tenantId,
      status: "active",
      ...(organisationId ? { id: organisationId } : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      accountCode: true,
      contracts: {
        where: { status: "active" },
        select: {
          id: true,
          name: true,
          contractType: true,
          monthlyMinutes: true,
          currency: true,
        },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const accounts = [];

  for (const org of orgs) {
    const [ticketsCreated, ticketsResolved, timeEntries, invoices] = await Promise.all([
      prisma.ticket.count({
        where: {
          tenantId,
          organisationId: org.id,
          deletedAt: null,
          createdAt: { gte: from, lte: to },
        },
      }),
      prisma.ticket.count({
        where: {
          tenantId,
          organisationId: org.id,
          deletedAt: null,
          OR: [
            { resolvedAt: { gte: from, lte: to } },
            { closedAt: { gte: from, lte: to } },
          ],
        },
      }),
      prisma.timeEntry.findMany({
        where: {
          tenantId,
          organisationId: org.id,
          createdAt: { gte: from, lte: to },
        },
        include: {
          user: { select: { name: true } },
          workType: { select: { name: true } },
        },
      }),
      prisma.invoice.findMany({
        where: {
          tenantId,
          organisationId: org.id,
          status: { not: "void" },
          createdAt: { gte: from, lte: to },
        },
        select: { total: true, currency: true, status: true, invoiceNumber: true },
      }),
    ]);

    const totalMinutes = timeEntries.reduce((s, e) => s + e.durationMinutes, 0);
    const billableMinutes = timeEntries
      .filter((e) => e.isBillable)
      .reduce((s, e) => s + e.durationMinutes, 0);
    const approvedMinutes = timeEntries
      .filter((e) => e.status === "approved" && e.isBillable)
      .reduce((s, e) => s + e.durationMinutes, 0);

    const byUser: Record<string, number> = {};
    const byWorkType: Record<string, number> = {};
    for (const e of timeEntries) {
      byUser[e.user.name] = (byUser[e.user.name] ?? 0) + e.durationMinutes;
      const wt = e.workType?.name ?? "Unspecified";
      byWorkType[wt] = (byWorkType[wt] ?? 0) + e.durationMinutes;
    }

    const contract = org.contracts[0] ?? null;
    const allowance = contract?.monthlyMinutes ?? null;
    const remaining =
      allowance != null ? Math.max(0, allowance - billableMinutes) : null;
    const overage =
      allowance != null ? Math.max(0, billableMinutes - allowance) : 0;

    const invoiceTotal = invoices.reduce((s, i) => s + i.total, 0);

    // Skip empty accounts unless a specific org was requested
    if (
      !organisationId &&
      ticketsCreated === 0 &&
      ticketsResolved === 0 &&
      totalMinutes === 0 &&
      invoices.length === 0
    ) {
      continue;
    }

    accounts.push({
      organisationId: org.id,
      name: org.name,
      accountCode: org.accountCode,
      contract: contract
        ? {
            id: contract.id,
            name: contract.name,
            type: contract.contractType,
            monthlyMinutes: contract.monthlyMinutes,
            currency: contract.currency,
          }
        : null,
      ticketsCreated,
      ticketsResolved,
      totalMinutes,
      billableMinutes,
      approvedMinutes,
      nonBillableMinutes: totalMinutes - billableMinutes,
      allowanceMinutes: allowance,
      remainingMinutes: remaining,
      overageMinutes: overage,
      byUser,
      byWorkType,
      invoiceCount: invoices.length,
      invoiceTotal,
      currency: invoices[0]?.currency ?? contract?.currency ?? "NZD",
    });
  }

  const totals = {
    accounts: accounts.length,
    ticketsCreated: accounts.reduce((s, a) => s + a.ticketsCreated, 0),
    ticketsResolved: accounts.reduce((s, a) => s + a.ticketsResolved, 0),
    totalMinutes: accounts.reduce((s, a) => s + a.totalMinutes, 0),
    billableMinutes: accounts.reduce((s, a) => s + a.billableMinutes, 0),
    approvedMinutes: accounts.reduce((s, a) => s + a.approvedMinutes, 0),
    invoiceTotal: accounts.reduce((s, a) => s + a.invoiceTotal, 0),
  };

  return {
    yearMonth,
    label,
    from: from.toISOString(),
    to: to.toISOString(),
    totals,
    accounts,
  };
}

export async function exportMonthlyAccountReportCsv(
  tenantId: string,
  yearMonth: string,
  organisationId?: string
) {
  const report = await getMonthlyAccountReport(tenantId, yearMonth, organisationId);
  const rows = report.accounts.map((a) => [
    report.label,
    a.accountCode ?? "",
    a.name,
    a.contract?.name ?? "",
    a.contract?.type ?? "",
    a.ticketsCreated,
    a.ticketsResolved,
    a.totalMinutes,
    Math.round((a.totalMinutes / 60) * 100) / 100,
    a.billableMinutes,
    Math.round((a.billableMinutes / 60) * 100) / 100,
    a.approvedMinutes,
    a.allowanceMinutes ?? "",
    a.remainingMinutes ?? "",
    a.overageMinutes,
    a.invoiceCount,
    a.invoiceTotal,
    a.currency,
  ]);

  return exportToCsv(
    [
      "Month",
      "Account Code",
      "Account",
      "Contract",
      "Contract Type",
      "Tickets Created",
      "Tickets Resolved",
      "Total Minutes",
      "Total Hours",
      "Billable Minutes",
      "Billable Hours",
      "Approved Minutes",
      "Allowance Minutes",
      "Remaining Minutes",
      "Overage Minutes",
      "Invoices",
      "Invoice Total",
      "Currency",
    ],
    rows
  );
}

export async function getYearlyAccountReport(
  tenantId: string,
  year: number,
  organisationId?: string
) {
  const months: string[] = [];
  for (let m = 1; m <= 12; m++) {
    months.push(`${year}-${String(m).padStart(2, "0")}`);
  }

  const monthlyReports = [];
  for (const yearMonth of months) {
    monthlyReports.push(await getMonthlyAccountReport(tenantId, yearMonth, organisationId));
  }

  const accountMap = new Map<
    string,
    {
      organisationId: string;
      name: string;
      accountCode: string | null;
      ticketsCreated: number;
      ticketsResolved: number;
      totalMinutes: number;
      billableMinutes: number;
      approvedMinutes: number;
      invoiceCount: number;
      invoiceTotal: number;
      currency: string;
      monthsActive: number;
    }
  >();

  for (const report of monthlyReports) {
    for (const a of report.accounts) {
      const existing = accountMap.get(a.organisationId) ?? {
        organisationId: a.organisationId,
        name: a.name,
        accountCode: a.accountCode,
        ticketsCreated: 0,
        ticketsResolved: 0,
        totalMinutes: 0,
        billableMinutes: 0,
        approvedMinutes: 0,
        invoiceCount: 0,
        invoiceTotal: 0,
        currency: a.currency,
        monthsActive: 0,
      };
      existing.ticketsCreated += a.ticketsCreated;
      existing.ticketsResolved += a.ticketsResolved;
      existing.totalMinutes += a.totalMinutes;
      existing.billableMinutes += a.billableMinutes;
      existing.approvedMinutes += a.approvedMinutes;
      existing.invoiceCount += a.invoiceCount;
      existing.invoiceTotal += a.invoiceTotal;
      if (a.totalMinutes > 0 || a.ticketsCreated > 0 || a.invoiceCount > 0) {
        existing.monthsActive += 1;
      }
      accountMap.set(a.organisationId, existing);
    }
  }

  const accounts = Array.from(accountMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const byMonth = monthlyReports.map((r) => ({
    yearMonth: r.yearMonth,
    label: r.label,
    totals: r.totals,
  }));

  return {
    year,
    label: `Calendar year ${year}`,
    byMonth,
    accounts,
    totals: {
      accounts: accounts.length,
      ticketsCreated: accounts.reduce((s, a) => s + a.ticketsCreated, 0),
      ticketsResolved: accounts.reduce((s, a) => s + a.ticketsResolved, 0),
      totalMinutes: accounts.reduce((s, a) => s + a.totalMinutes, 0),
      billableMinutes: accounts.reduce((s, a) => s + a.billableMinutes, 0),
      approvedMinutes: accounts.reduce((s, a) => s + a.approvedMinutes, 0),
      invoiceTotal: accounts.reduce((s, a) => s + a.invoiceTotal, 0),
    },
  };
}

export async function exportYearlyAccountReportCsv(
  tenantId: string,
  year: number,
  organisationId?: string
) {
  const report = await getYearlyAccountReport(tenantId, year, organisationId);
  const rows = report.accounts.map((a) => [
    report.year,
    a.accountCode ?? "",
    a.name,
    a.monthsActive,
    a.ticketsCreated,
    a.ticketsResolved,
    a.totalMinutes,
    Math.round((a.totalMinutes / 60) * 100) / 100,
    a.billableMinutes,
    Math.round((a.billableMinutes / 60) * 100) / 100,
    a.approvedMinutes,
    a.invoiceCount,
    a.invoiceTotal,
    a.currency,
  ]);
  return exportToCsv(
    [
      "Year",
      "Account Code",
      "Account",
      "Months Active",
      "Tickets Created",
      "Tickets Resolved",
      "Total Minutes",
      "Total Hours",
      "Billable Minutes",
      "Billable Hours",
      "Approved Minutes",
      "Invoices",
      "Invoice Total",
      "Currency",
    ],
    rows
  );
}
