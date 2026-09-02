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
