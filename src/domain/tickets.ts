import { prisma } from "@/lib/prisma";
import { logActivity } from "@/domain/activity";
import { applySlaToTicket } from "@/domain/sla";
import { notifyTicketAssigned } from "@/domain/notifications";

export async function generateTicketNumber(tenantId: string): Promise<string> {
  const sequence = await prisma.ticketSequence.upsert({
    where: { tenantId },
    update: { nextVal: { increment: 1 } },
    create: { tenantId, nextVal: 1001 },
  });
  return `OCSD-${sequence.nextVal}`;
}

export type TicketView = "all" | "my" | "unassigned" | "open" | "in_progress" | "waiting" | "resolved";

export async function listTickets(
  tenantId: string,
  view: TicketView = "all",
  userId?: string
) {
  const where: Record<string, unknown> = {
    tenantId,
    deletedAt: null,
  };

  switch (view) {
    case "my":
      where.assigneeId = userId;
      break;
    case "unassigned":
      where.assigneeId = null;
      break;
    case "open":
      where.status = { category: "open" };
      break;
    case "in_progress":
      where.status = { code: "in_progress" };
      break;
    case "waiting":
      where.status = { category: "waiting" };
      break;
    case "resolved":
      where.status = { category: { in: ["resolved", "closed"] } };
      break;
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
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getTicket(tenantId: string, id: string) {
  return prisma.ticket.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      organisation: true,
      contact: true,
      assignee: true,
      team: true,
      status: true,
      priority: true,
      ticketType: true,
      category: true,
      subcategory: true,
      asset: true,
      createdBy: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      internalNotes: { include: { author: true }, orderBy: { createdAt: "asc" } },
      attachments: { include: { uploadedBy: true }, orderBy: { createdAt: "asc" } },
      activities: { include: { actor: true }, orderBy: { createdAt: "asc" } },
      timeEntries: { include: { user: true, workType: true }, orderBy: { createdAt: "desc" } },
    },
  });
}

export async function createTicket(params: {
  tenantId: string;
  createdById: string;
  subject: string;
  description: string;
  organisationId: string;
  contactId?: string;
  assigneeId?: string;
  teamId?: string;
  priorityId: string;
  ticketTypeId: string;
  categoryId?: string;
  subcategoryId?: string;
  assetId?: string;
  source?: string;
}) {
  const defaultStatus = await prisma.workflowStatus.findFirst({
    where: {
      workflow: { tenantId: params.tenantId, isDefault: true },
      code: "open",
    },
  });

  if (!defaultStatus) throw new Error("Default workflow status not found");

  const ticketNumber = await generateTicketNumber(params.tenantId);

  const ticket = await prisma.ticket.create({
    data: {
      tenantId: params.tenantId,
      ticketNumber,
      subject: params.subject,
      description: params.description,
      organisationId: params.organisationId,
      contactId: params.contactId,
      assigneeId: params.assigneeId,
      teamId: params.teamId,
      statusId: defaultStatus.id,
      priorityId: params.priorityId,
      ticketTypeId: params.ticketTypeId,
      categoryId: params.categoryId,
      subcategoryId: params.subcategoryId,
      assetId: params.assetId,
      source: params.source ?? "agent",
      createdById: params.createdById,
    },
    include: {
      organisation: true,
      status: true,
      priority: true,
      ticketType: true,
      assignee: true,
    },
  });

  await logActivity({
    ticketId: ticket.id,
    actorId: params.createdById,
    eventType: "ticket.created",
    visibility: "customer",
  });

  if (params.assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: params.assigneeId } });
    await logActivity({
      ticketId: ticket.id,
      actorId: params.createdById,
      eventType: "ticket.assigned",
      payload: { assignee: assignee?.name },
      visibility: "customer",
    });
    await notifyTicketAssigned(ticket.id, params.assigneeId, ticket.ticketNumber, ticket.subject);
  }

  await applySlaToTicket(params.tenantId, ticket.id, params.priorityId);

  return ticket;
}

export async function updateTicket(
  tenantId: string,
  ticketId: string,
  actorId: string,
  data: {
    subject?: string;
    description?: string;
    assigneeId?: string | null;
    teamId?: string | null;
    priorityId?: string;
    contactId?: string | null;
    categoryId?: string | null;
    assetId?: string | null;
  }
) {
  const existing = await prisma.ticket.findFirst({ where: { id: ticketId, tenantId } });
  if (!existing) throw new Error("Ticket not found");

  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data,
    include: { assignee: true, priority: true, status: true },
  });

  if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) {
    await logActivity({
      ticketId,
      actorId,
      eventType: existing.assigneeId ? "ticket.reassigned" : "ticket.assigned",
      payload: { assignee: ticket.assignee?.name ?? "Unassigned" },
      visibility: "customer",
    });
  }

  if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId && data.assigneeId) {
    await notifyTicketAssigned(ticketId, data.assigneeId, existing.ticketNumber, existing.subject);
  }

  if (data.priorityId && data.priorityId !== existing.priorityId) {
    const oldPriority = await prisma.priority.findUnique({ where: { id: existing.priorityId } });
    const newPriority = await prisma.priority.findUnique({ where: { id: data.priorityId } });
    await logActivity({
      ticketId,
      actorId,
      eventType: "priority.changed",
      payload: { from: oldPriority?.name, to: newPriority?.name },
      visibility: "internal",
    });
  }

  return ticket;
}

export async function transitionTicket(
  tenantId: string,
  ticketId: string,
  actorId: string,
  transitionId: string,
  fields?: Record<string, string>
) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, tenantId },
    include: { status: true },
  });
  if (!ticket) throw new Error("Ticket not found");

  const transition = await prisma.workflowTransition.findUnique({
    where: { id: transitionId },
    include: { fromStatus: true, toStatus: true },
  });
  if (!transition || transition.fromStatusId !== ticket.statusId) {
    throw new Error("Invalid transition");
  }

  const requiredFields: string[] = JSON.parse(transition.requiredFields);
  for (const field of requiredFields) {
    if (!fields?.[field]) {
      throw new Error(`Field required: ${field}`);
    }
  }

  const updateData: Record<string, unknown> = {
    statusId: transition.toStatusId,
  };

  if (fields?.resolution_summary) {
    updateData.resolutionSummary = fields.resolution_summary;
  }

  if (transition.toStatus.code === "resolved") {
    updateData.resolvedAt = new Date();
  }
  if (transition.toStatus.code === "closed") {
    updateData.closedAt = new Date();
  }
  if (transition.toStatus.code === "in_progress" && ticket.resolvedAt) {
    updateData.resolvedAt = null;
    updateData.closedAt = null;
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: updateData,
    include: { status: true, assignee: true, priority: true },
  });

  await logActivity({
    ticketId,
    actorId,
    eventType: "status.changed",
    payload: { from: transition.fromStatus.name, to: transition.toStatus.name },
    visibility: "customer",
  });

  if (transition.toStatus.code === "resolved") {
    await logActivity({ ticketId, actorId, eventType: "ticket.resolved", visibility: "customer" });
  }
  if (transition.toStatus.code === "closed") {
    await logActivity({ ticketId, actorId, eventType: "ticket.closed", visibility: "customer" });
  }
  if (transition.name === "Reopen") {
    await logActivity({ ticketId, actorId, eventType: "ticket.reopened", visibility: "customer" });
  }

  return updated;
}

export async function getAvailableTransitions(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return [];

  return prisma.workflowTransition.findMany({
    where: { fromStatusId: ticket.statusId },
    include: { toStatus: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getDashboardStats(tenantId: string, userId: string) {
  const { getSlaAtRiskTickets } = await import("@/domain/sla");

  const [myOpen, unassigned, recent, slaAtRisk] = await Promise.all([
    prisma.ticket.count({
      where: {
        tenantId,
        assigneeId: userId,
        deletedAt: null,
        status: { category: "open" },
      },
    }),
    prisma.ticket.count({
      where: {
        tenantId,
        assigneeId: null,
        deletedAt: null,
        status: { category: { in: ["open", "waiting"] } },
      },
    }),
    prisma.ticket.findMany({
      where: { tenantId, deletedAt: null },
      include: { organisation: true, status: true, priority: true, assignee: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    getSlaAtRiskTickets(tenantId),
  ]);

  const myTicketsList = await prisma.ticket.findMany({
    where: {
      tenantId,
      assigneeId: userId,
      deletedAt: null,
      status: { category: "open" },
    },
    include: { organisation: true, status: true, priority: true },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return { myOpen, unassigned, recent, myTickets: myTicketsList, slaAtRisk };
}
