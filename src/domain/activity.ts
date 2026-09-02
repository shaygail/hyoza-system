import { prisma } from "@/lib/prisma";

export { getActivityLabel } from "@/lib/activity-labels";

export async function logActivity(params: {
  ticketId: string;
  actorId?: string;
  eventType: string;
  payload?: Record<string, unknown>;
  visibility?: "customer" | "internal";
}) {
  return prisma.ticketActivity.create({
    data: {
      ticketId: params.ticketId,
      actorId: params.actorId,
      eventType: params.eventType,
      payload: JSON.stringify(params.payload ?? {}),
      visibility: params.visibility ?? "internal",
    },
  });
}
