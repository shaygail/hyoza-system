import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type TicketSearchParams = {
  q?: string;
  statusId?: string;
  priorityId?: string;
  assigneeId?: string;
  organisationId?: string;
  ticketTypeId?: string;
  categoryId?: string;
};

export async function searchTickets(tenantId: string, params: TicketSearchParams) {
  const where: Prisma.TicketWhereInput = {
    tenantId,
    deletedAt: null,
  };

  if (params.statusId) where.statusId = params.statusId;
  if (params.priorityId) where.priorityId = params.priorityId;
  if (params.assigneeId) where.assigneeId = params.assigneeId === "unassigned" ? null : params.assigneeId;
  if (params.organisationId) where.organisationId = params.organisationId;
  if (params.ticketTypeId) where.ticketTypeId = params.ticketTypeId;
  if (params.categoryId) where.categoryId = params.categoryId;

  if (params.q) {
    const q = params.q.trim();
    where.OR = [
      { ticketNumber: { contains: q } },
      { subject: { contains: q } },
      { description: { contains: q } },
      { organisation: { name: { contains: q } } },
      { contact: { name: { contains: q } } },
      { contact: { email: { contains: q } } },
      { assignee: { name: { contains: q } } },
    ];
  }

  return prisma.ticket.findMany({
    where,
    include: {
      organisation: true,
      contact: true,
      assignee: true,
      status: true,
      priority: true,
      ticketType: true,
      category: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}
