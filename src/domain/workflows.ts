import { prisma } from "@/lib/prisma";

export interface WorkflowCondition {
  field: string;
  operator: "eq" | "neq" | "in";
  value: string | string[];
}

export interface WorkflowAction {
  type: "require_field" | "set_assignee" | "notify";
  value: string;
}

export async function listWorkflows(tenantId: string) {
  return prisma.workflow.findMany({
    where: { tenantId },
    include: {
      statuses: { orderBy: { sortOrder: "asc" } },
      transitions: {
        include: { fromStatus: true, toStatus: true },
        orderBy: { sortOrder: "asc" },
      },
      ticketTypes: true,
    },
  });
}

export async function getWorkflow(tenantId: string, workflowId: string) {
  return prisma.workflow.findFirst({
    where: { id: workflowId, tenantId },
    include: {
      statuses: { orderBy: { sortOrder: "asc" } },
      transitions: {
        include: { fromStatus: true, toStatus: true },
        orderBy: { sortOrder: "asc" },
      },
      ticketTypes: true,
    },
  });
}

function evaluateTransitionConditions(
  conditions: WorkflowCondition[],
  context: Record<string, unknown>
): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((c) => {
    const actual = context[c.field];
    switch (c.operator) {
      case "eq":
        return actual === c.value;
      case "neq":
        return actual !== c.value;
      case "in":
        return Array.isArray(c.value) && c.value.includes(String(actual));
      default:
        return true;
    }
  });
}

export async function getAvailableTransitionsForTicket(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { priority: true, ticketType: true, status: true },
  });
  if (!ticket) return [];

  const transitions = await prisma.workflowTransition.findMany({
    where: { fromStatusId: ticket.statusId },
    include: { toStatus: true },
    orderBy: { sortOrder: "asc" },
  });

  const context = {
    priorityCode: ticket.priority.code,
    ticketTypeCode: ticket.ticketType.code,
    statusCode: ticket.status.code,
  };

  return transitions.filter((t) => {
    const conditions: WorkflowCondition[] = JSON.parse(t.conditions || "[]");
    return evaluateTransitionConditions(conditions, context);
  });
}

export async function updateWorkflowTransition(
  tenantId: string,
  transitionId: string,
  data: {
    name?: string;
    conditions?: WorkflowCondition[];
    actions?: WorkflowAction[];
    requiredFields?: string[];
  }
) {
  const transition = await prisma.workflowTransition.findUnique({
    where: { id: transitionId },
    include: { workflow: true },
  });
  if (!transition || transition.workflow.tenantId !== tenantId) {
    throw new Error("Transition not found");
  }

  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.conditions !== undefined) update.conditions = JSON.stringify(data.conditions);
  if (data.actions !== undefined) update.actions = JSON.stringify(data.actions);
  if (data.requiredFields !== undefined) update.requiredFields = JSON.stringify(data.requiredFields);

  return prisma.workflowTransition.update({
    where: { id: transitionId },
    data: update,
    include: { fromStatus: true, toStatus: true },
  });
}
