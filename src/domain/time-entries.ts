import { prisma } from "@/lib/prisma";
import { logActivity } from "@/domain/activity";

export async function listTimeEntries(tenantId: string, filters?: { ticketId?: string; userId?: string }) {
  return prisma.timeEntry.findMany({
    where: {
      tenantId,
      ...(filters?.ticketId ? { ticketId: filters.ticketId } : {}),
      ...(filters?.userId ? { userId: filters.userId } : {}),
    },
    include: {
      ticket: { select: { id: true, ticketNumber: true, subject: true } },
      user: { select: { id: true, name: true } },
      workType: true,
      organisation: { select: { id: true, name: true } },
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
  notes?: string;
  startedAt?: Date;
  endedAt?: Date;
}) {
  const entry = await prisma.timeEntry.create({
    data: {
      tenantId: params.tenantId,
      ticketId: params.ticketId,
      userId: params.userId,
      organisationId: params.organisationId,
      durationMinutes: params.durationMinutes,
      workTypeId: params.workTypeId,
      isBillable: params.isBillable ?? true,
      notes: params.notes,
      startedAt: params.startedAt,
      endedAt: params.endedAt,
    },
    include: { user: true, workType: true },
  });

  await logActivity({
    ticketId: params.ticketId,
    actorId: params.userId,
    eventType: "time_entry.added",
    payload: { durationMinutes: params.durationMinutes },
    visibility: "internal",
  });

  return entry;
}

export async function getTicketTimeTotal(ticketId: string) {
  const result = await prisma.timeEntry.aggregate({
    where: { ticketId },
    _sum: { durationMinutes: true },
  });
  return result._sum.durationMinutes ?? 0;
}
