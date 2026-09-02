import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type FilterCondition = {
  field: string;
  operator: "eq" | "neq" | "in" | "contains" | "is_null" | "is_not_null";
  value?: string | string[] | boolean | null;
};

export type FilterDefinition = {
  conditions: FilterCondition[];
  logic: "AND" | "OR";
};

function buildWhereFromFilter(
  tenantId: string,
  filter: FilterDefinition,
  baseWhere: Prisma.TicketWhereInput = {}
): Prisma.TicketWhereInput {
  const conditions: Prisma.TicketWhereInput[] = filter.conditions.map((c) => {
    switch (c.field) {
      case "assigneeId":
        if (c.operator === "is_null") return { assigneeId: null };
        if (c.operator === "eq") return { assigneeId: c.value as string };
        break;
      case "priority.code":
        if (c.operator === "eq") return { priority: { code: c.value as string } };
        if (c.operator === "neq") return { priority: { code: { not: c.value as string } } };
        break;
      case "status.code":
        if (c.operator === "eq") return { status: { code: c.value as string } };
        if (c.operator === "neq") return { status: { code: { not: c.value as string } } };
        break;
      case "status.category":
        if (c.operator === "eq") return { status: { category: c.value as string } };
        if (c.operator === "neq") return { status: { category: { not: c.value as string } } };
        break;
      case "assigneeId.my":
        return { assigneeId: c.value as string };
      default:
        break;
    }
    return {};
  });

  const combined =
    filter.logic === "OR" ? { OR: conditions } : conditions.length ? { AND: conditions } : {};

  return { tenantId, deletedAt: null, ...baseWhere, ...combined };
}

export async function listQueues(tenantId: string, userId: string) {
  const pins = await prisma.userQueuePin.findMany({
    where: { userId },
    include: { queue: true },
    orderBy: { sortOrder: "asc" },
  });

  const queues = await prisma.queue.findMany({
    where: {
      tenantId,
      OR: [{ visibility: "global" }, { isSystem: true }],
    },
    orderBy: { name: "asc" },
  });

  const pinnedIds = new Set(pins.map((p) => p.queueId));
  const unpinned = queues.filter((q) => !pinnedIds.has(q.id));

  return {
    pinned: pins.map((p) => p.queue),
    all: unpinned,
  };
}

export async function getQueueTickets(
  tenantId: string,
  queueId: string,
  userId?: string
) {
  const queue = await prisma.queue.findFirst({ where: { id: queueId, tenantId } });
  if (!queue) throw new Error("Queue not found");

  const filter: FilterDefinition = JSON.parse(queue.filterDefinition || "{}");
  if (!filter.conditions) filter.conditions = [];

  // Replace dynamic placeholders
  filter.conditions = filter.conditions.map((c) => {
    if (c.field === "assigneeId.my" && userId) {
      return { field: "assigneeId", operator: "eq" as const, value: userId };
    }
    return c;
  });

  const where = buildWhereFromFilter(tenantId, filter);

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
    orderBy: { [queue.sortBy]: queue.sortDirection as "asc" | "desc" },
  });
}

export async function pinQueue(userId: string, queueId: string) {
  return prisma.userQueuePin.upsert({
    where: { userId_queueId: { userId, queueId } },
    update: {},
    create: { userId, queueId },
  });
}

export async function unpinQueue(userId: string, queueId: string) {
  return prisma.userQueuePin.delete({
    where: { userId_queueId: { userId, queueId } },
  });
}

export { buildWhereFromFilter };
