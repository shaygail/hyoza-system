import { prisma } from "@/lib/prisma";

export async function getBoardData(tenantId: string) {
  const workflow = await prisma.workflow.findFirst({
    where: { tenantId, isDefault: true },
    include: {
      statuses: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!workflow) return { columns: [], tickets: [] };

  const statuses = workflow.statuses.filter((s) => !s.isTerminal || s.code === "resolved");

  const tickets = await prisma.ticket.findMany({
    where: {
      tenantId,
      deletedAt: null,
      statusId: { in: statuses.map((s) => s.id) },
    },
    include: {
      organisation: true,
      assignee: true,
      priority: true,
      status: true,
      ticketType: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const columns = statuses.map((status) => ({
    ...status,
    tickets: tickets.filter((t) => t.statusId === status.id),
  }));

  return { columns };
}

export async function moveTicketOnBoard(
  tenantId: string,
  ticketId: string,
  toStatusId: string,
  actorId: string
) {
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, tenantId } });
  if (!ticket) throw new Error("Ticket not found");

  const transition = await prisma.workflowTransition.findFirst({
    where: { fromStatusId: ticket.statusId, toStatusId },
  });

  if (transition) {
    const { transitionTicket } = await import("@/domain/tickets");
    return transitionTicket(tenantId, ticketId, actorId, transition.id);
  }

  const toStatus = await prisma.workflowStatus.findUnique({ where: { id: toStatusId } });
  const fromStatus = await prisma.workflowStatus.findUnique({ where: { id: ticket.statusId } });
  if (!toStatus || !fromStatus) throw new Error("Invalid status");

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { statusId: toStatusId },
    include: { status: true, priority: true, assignee: true, organisation: true },
  });

  const { logActivity } = await import("@/domain/activity");
  await logActivity({
    ticketId,
    actorId,
    eventType: "status.changed",
    payload: { from: fromStatus.name, to: toStatus.name },
    visibility: "customer",
  });

  return updated;
}
