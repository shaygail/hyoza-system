import { prisma } from "@/lib/prisma";
import { getActiveContractForOrganisation } from "@/domain/contracts";
import { logActivity } from "@/domain/activity";

export async function listTimeEntries(
  tenantId: string,
  filters?: { ticketId?: string; userId?: string; status?: string; contractId?: string }
) {
  return prisma.timeEntry.findMany({
    where: {
      tenantId,
      ...(filters?.ticketId ? { ticketId: filters.ticketId } : {}),
      ...(filters?.userId ? { userId: filters.userId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.contractId ? { contractId: filters.contractId } : {}),
    },
    include: {
      ticket: { select: { id: true, ticketNumber: true, subject: true } },
      user: { select: { id: true, name: true } },
      workType: true,
      organisation: { select: { id: true, name: true } },
      contract: { select: { id: true, name: true, contractType: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTimeEntry(params: {
  tenantId: string;
  ticketId: string;
  userId: string;
  organisationId: string;
  durationMinutes: number;
  workTypeId?: string;
  isBillable?: boolean;
  notes: string;
  startedAt?: Date;
  endedAt?: Date;
  contractId?: string;
}) {
  const notes = params.notes?.trim();
  if (!notes) {
    throw new Error("Notes are required when logging time");
  }
  if (!Number.isFinite(params.durationMinutes) || params.durationMinutes < 1) {
    throw new Error("Duration must be at least 1 minute");
  }

  let contractId = params.contractId;
  if (!contractId) {
    const active = await getActiveContractForOrganisation(params.tenantId, params.organisationId);
    contractId = active?.id;
  }

  const entry = await prisma.timeEntry.create({
    data: {
      tenantId: params.tenantId,
      ticketId: params.ticketId,
      userId: params.userId,
      organisationId: params.organisationId,
      contractId,
      durationMinutes: params.durationMinutes,
      workTypeId: params.workTypeId,
      isBillable: params.isBillable ?? true,
      notes,
      startedAt: params.startedAt,
      endedAt: params.endedAt,
      status: "submitted",
    },
    include: { user: true, workType: true, contract: true },
  });

  await logActivity({
    ticketId: params.ticketId,
    actorId: params.userId,
    eventType: "time_entry.added",
    payload: { durationMinutes: params.durationMinutes, notesPreview: notes.slice(0, 80) },
    visibility: "internal",
  });

  return entry;
}

export async function approveTimeEntry(tenantId: string, entryId: string, approverId: string) {
  const entry = await prisma.timeEntry.findFirst({ where: { id: entryId, tenantId } });
  if (!entry) throw new Error("Time entry not found");

  return prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      status: "approved",
      approvedById: approverId,
      approvedAt: new Date(),
    },
    include: { user: true, workType: true, ticket: true },
  });
}

export async function rejectTimeEntry(tenantId: string, entryId: string, approverId: string) {
  const entry = await prisma.timeEntry.findFirst({ where: { id: entryId, tenantId } });
  if (!entry) throw new Error("Time entry not found");

  return prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      status: "rejected",
      approvedById: approverId,
      approvedAt: new Date(),
    },
    include: { user: true, workType: true, ticket: true },
  });
}

export async function getTicketTimeTotal(ticketId: string) {
  const result = await prisma.timeEntry.aggregate({
    where: { ticketId },
    _sum: { durationMinutes: true },
  });
  return result._sum.durationMinutes ?? 0;
}
