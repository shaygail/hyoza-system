import { prisma } from "@/lib/prisma";
import {
  addBusinessMinutes,
  businessMinutesBetween,
  parseCalendar,
  type BusinessCalendarConfig,
} from "@/domain/business-time";

export { addBusinessMinutes, businessMinutesBetween, parseCalendar };
export type { BusinessCalendarConfig };

export async function getDefaultCalendar(tenantId: string) {
  return prisma.businessCalendar.findFirst({
    where: { tenantId, isDefault: true },
  });
}

export async function computeSlaDueDatesWithCalendar(
  tenantId: string,
  createdAt: Date,
  responseMinutes: number,
  resolutionMinutes: number,
  calendarId?: string | null
) {
  const calendar = calendarId
    ? await prisma.businessCalendar.findUnique({ where: { id: calendarId } })
    : await getDefaultCalendar(tenantId);

  if (!calendar) {
    return {
      responseDueAt: new Date(createdAt.getTime() + responseMinutes * 60 * 1000),
      resolutionDueAt: new Date(createdAt.getTime() + resolutionMinutes * 60 * 1000),
    };
  }

  const config = parseCalendar(calendar);
  return {
    responseDueAt: addBusinessMinutes(createdAt, responseMinutes, config),
    resolutionDueAt: addBusinessMinutes(createdAt, resolutionMinutes, config),
  };
}

export async function pauseSla(ticketId: string, reason?: string) {
  const active = await prisma.slaPause.findFirst({
    where: { ticketId, endedAt: null },
  });
  if (active) return active;

  return prisma.slaPause.create({
    data: { ticketId, reason },
  });
}

export async function resumeSla(ticketId: string) {
  const active = await prisma.slaPause.findFirst({
    where: { ticketId, endedAt: null },
  });
  if (!active) return null;

  const endedAt = new Date();

  await prisma.slaPause.update({
    where: { id: active.id },
    data: { endedAt },
  });

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { slaPolicy: { include: { businessCalendar: true } } },
  });
  if (!ticket) return null;

  // Shift due dates by the *business* time spent paused, using the same calendar
  // the due dates were computed with. Without a calendar, fall back to wall-clock.
  const calendarRow =
    ticket.slaPolicy?.businessCalendar ?? (await getDefaultCalendar(ticket.tenantId));
  const calendar = calendarRow ? parseCalendar(calendarRow) : null;
  const pauseMinutes = calendar
    ? businessMinutesBetween(active.startedAt, endedAt, calendar)
    : Math.floor((endedAt.getTime() - active.startedAt.getTime()) / 60000);
  const shift = (d: Date) =>
    calendar
      ? addBusinessMinutes(d, pauseMinutes, calendar)
      : new Date(d.getTime() + pauseMinutes * 60000);

  const updates: { responseDueAt?: Date; resolutionDueAt?: Date; dueAt?: Date } = {};
  if (pauseMinutes > 0 && ticket.responseDueAt && !ticket.firstResponseAt) {
    updates.responseDueAt = shift(ticket.responseDueAt);
  }
  if (pauseMinutes > 0 && ticket.resolutionDueAt) {
    updates.resolutionDueAt = shift(ticket.resolutionDueAt);
    updates.dueAt = updates.resolutionDueAt;
  }

  if (Object.keys(updates).length > 0) {
    await prisma.ticket.update({ where: { id: ticketId }, data: updates });
  }

  return { pauseMinutes };
}

export async function handleSlaOnStatusChange(
  ticketId: string,
  fromPausesSla: boolean,
  toPausesSla: boolean
) {
  if (!fromPausesSla && toPausesSla) {
    await pauseSla(ticketId, "Status pauses SLA");
  } else if (fromPausesSla && !toPausesSla) {
    await resumeSla(ticketId);
  }
}

export async function checkSlaEscalations(tenantId: string) {
  const policies = await prisma.slaPolicy.findMany({
    where: { tenantId, escalationMinutes: { not: null } },
    include: { priority: true },
  });

  const escalated: string[] = [];

  for (const policy of policies) {
    if (!policy.escalationMinutes) continue;

    const threshold = new Date(Date.now() - policy.escalationMinutes * 60 * 1000);
    const tickets = await prisma.ticket.findMany({
      where: {
        tenantId,
        slaPolicyId: policy.id,
        deletedAt: null,
        firstResponseAt: null,
        slaEscalatedAt: null,
        createdAt: { lte: threshold },
        status: { category: { in: ["open", "waiting"] } },
      },
      include: { assignee: true },
    });

    for (const ticket of tickets) {
      if (policy.escalationAction === "notify") {
        const { notifyWatchersOfSlaEscalation } = await import("@/domain/ticket-watchers");
        await notifyWatchersOfSlaEscalation(ticket);
      }
      // Record the escalation so a continuously running worker doesn't re-notify.
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { slaEscalatedAt: new Date() },
      });
      const { logActivity } = await import("@/domain/activity");
      await logActivity({
        ticketId: ticket.id,
        eventType: "sla.escalated",
        payload: { policy: policy.name, priority: policy.priority.name },
      });
      escalated.push(ticket.id);
    }
  }

  return escalated;
}
