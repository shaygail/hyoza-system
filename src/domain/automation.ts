import { prisma } from "@/lib/prisma";
import { logActivity } from "@/domain/activity";
import { createNotification } from "@/domain/notifications";

export type AutomationTrigger =
  | "ticket.created"
  | "status.changed"
  | "priority.changed"
  | "ticket.assigned";

export interface AutomationCondition {
  field: string;
  operator: "eq" | "neq" | "in" | "contains";
  value: string | string[] | boolean;
}

export interface AutomationAction {
  type: "set_priority" | "set_assignee" | "add_tag" | "notify" | "add_comment";
  value: string;
}

function evaluateCondition(
  condition: AutomationCondition,
  context: Record<string, unknown>
): boolean {
  const actual = context[condition.field];
  const expected = condition.value;

  switch (condition.operator) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "in":
      return Array.isArray(expected) && expected.includes(String(actual));
    case "contains":
      return String(actual).toLowerCase().includes(String(expected).toLowerCase());
    default:
      return false;
  }
}

function evaluateConditions(
  conditions: AutomationCondition[],
  context: Record<string, unknown>
): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, context));
}

async function executeAction(
  action: AutomationAction,
  ticketId: string,
  tenantId: string
) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return;

  switch (action.type) {
    case "set_priority": {
      const priority = await prisma.priority.findFirst({
        where: { tenantId, code: action.value },
      });
      if (priority) {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { priorityId: priority.id },
        });
        await logActivity({
          ticketId,
          eventType: "automation.priority_set",
          payload: { priority: priority.name },
          visibility: "internal",
        });
      }
      break;
    }
    case "set_assignee": {
      const user = await prisma.user.findFirst({
        where: { tenantId, email: action.value },
      });
      if (user) {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { assigneeId: user.id },
        });
        await createNotification({
          userId: user.id,
          eventType: "ticket.assigned",
          title: `Auto-assigned: ${ticket.ticketNumber}`,
          body: ticket.subject,
          linkUrl: `/app/tickets/${ticket.id}`,
        });
      }
      break;
    }
    case "add_tag": {
      const tags: string[] = JSON.parse(ticket.tags);
      if (!tags.includes(action.value)) {
        tags.push(action.value);
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { tags: JSON.stringify(tags) },
        });
      }
      break;
    }
    case "notify": {
      const user = await prisma.user.findFirst({
        where: { tenantId, email: action.value },
      });
      if (user) {
        await createNotification({
          userId: user.id,
          eventType: "automation.notify",
          title: `Automation: ${ticket.ticketNumber}`,
          body: ticket.subject,
          linkUrl: `/app/tickets/${ticket.id}`,
        });
      }
      break;
    }
    case "add_comment": {
      const systemUser = await prisma.user.findFirst({
        where: { tenantId, userRoles: { some: { role: { code: "administrator" } } } },
      });
      if (systemUser) {
        await prisma.ticketComment.create({
          data: { ticketId, authorId: systemUser.id, body: action.value },
        });
      }
      break;
    }
  }
}

export async function runAutomationRules(
  tenantId: string,
  trigger: AutomationTrigger,
  ticketId: string,
  context: Record<string, unknown> = {}
) {
  const rules = await prisma.automationRule.findMany({
    where: { tenantId, trigger, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  for (const rule of rules) {
    const conditions: AutomationCondition[] = JSON.parse(rule.conditions);
    const actions: AutomationAction[] = JSON.parse(rule.actions);

    if (!evaluateConditions(conditions, context)) continue;

    for (const action of actions) {
      await executeAction(action, ticketId, tenantId);
    }
  }
}

export async function listAutomationRules(tenantId: string) {
  return prisma.automationRule.findMany({
    where: { tenantId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createAutomationRule(
  tenantId: string,
  data: {
    name: string;
    description?: string;
    trigger: string;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
    isActive?: boolean;
  }
) {
  return prisma.automationRule.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description,
      trigger: data.trigger,
      conditions: JSON.stringify(data.conditions),
      actions: JSON.stringify(data.actions),
      isActive: data.isActive ?? true,
    },
  });
}

export async function updateAutomationRule(
  id: string,
  tenantId: string,
  data: Partial<{
    name: string;
    description: string;
    trigger: string;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
    isActive: boolean;
  }>
) {
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.description !== undefined) update.description = data.description;
  if (data.trigger !== undefined) update.trigger = data.trigger;
  if (data.conditions !== undefined) update.conditions = JSON.stringify(data.conditions);
  if (data.actions !== undefined) update.actions = JSON.stringify(data.actions);
  if (data.isActive !== undefined) update.isActive = data.isActive;

  return prisma.automationRule.updateMany({
    where: { id, tenantId },
    data: update,
  });
}
