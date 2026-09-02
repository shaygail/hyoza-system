import { prisma } from "@/lib/prisma";

export async function getSlaPolicyForPriority(tenantId: string, priorityId: string) {
  return prisma.slaPolicy.findFirst({
    where: { tenantId, priorityId },
  });
}

export function computeSlaDueDates(
  createdAt: Date,
  responseMinutes: number,
  resolutionMinutes: number
) {
  const responseDueAt = new Date(createdAt.getTime() + responseMinutes * 60 * 1000);
  const resolutionDueAt = new Date(createdAt.getTime() + resolutionMinutes * 60 * 1000);
  return { responseDueAt, resolutionDueAt };
}

export async function applySlaToTicket(tenantId: string, ticketId: string, priorityId: string) {
  const policy = await getSlaPolicyForPriority(tenantId, priorityId);
  if (!policy) return null;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return null;

  const { responseDueAt, resolutionDueAt } = computeSlaDueDates(
    ticket.createdAt,
    policy.responseMinutes,
    policy.resolutionMinutes
  );

  return prisma.ticket.update({
    where: { id: ticketId },
    data: {
      slaPolicyId: policy.id,
      responseDueAt,
      resolutionDueAt,
      dueAt: resolutionDueAt,
    },
  });
}

export function isSlaAtRisk(resolutionDueAt: Date | null, thresholdPercent = 0.25): boolean {
  if (!resolutionDueAt) return false;
  const now = Date.now();
  const due = resolutionDueAt.getTime();
  if (now >= due) return true;
  const created = due - 24 * 60 * 60 * 1000; // approximate window
  const remaining = due - now;
  const total = due - created;
  return remaining / total <= thresholdPercent;
}

export async function getSlaAtRiskTickets(tenantId: string) {
  const now = new Date();
  const soon = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  return prisma.ticket.findMany({
    where: {
      tenantId,
      deletedAt: null,
      resolutionDueAt: { lte: soon },
      status: { category: { in: ["open", "waiting"] } },
    },
    include: {
      organisation: true,
      status: true,
      priority: true,
      assignee: true,
    },
    orderBy: { resolutionDueAt: "asc" },
    take: 20,
  });
}
