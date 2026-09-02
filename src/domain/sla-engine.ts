import { prisma } from "@/lib/prisma";
import { createNotification } from "@/domain/notifications";

export interface BusinessCalendarConfig {
  timezone: string;
  workDays: number[];
  startTime: string;
  endTime: string;
  holidays: string[];
}

export function parseCalendar(raw: {
  timezone: string;
  workDays: string;
  startTime: string;
  endTime: string;
  holidays: string;
}): BusinessCalendarConfig {
  return {
    timezone: raw.timezone,
    workDays: JSON.parse(raw.workDays) as number[],
    startTime: raw.startTime,
    endTime: raw.endTime,
    holidays: JSON.parse(raw.holidays) as string[],
  };
}

function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":").map(Number);
  return { hours: h, minutes: m };
}

function isHoliday(date: Date, holidays: string[]): boolean {
  const key = date.toISOString().slice(0, 10);
  return holidays.includes(key);
}

function isWorkDay(date: Date, workDays: number[]): boolean {
  return workDays.includes(date.getDay());
}

function isWithinBusinessHours(date: Date, calendar: BusinessCalendarConfig): boolean {
  if (!isWorkDay(date, calendar.workDays)) return false;
  if (isHoliday(date, calendar.holidays)) return false;
  const { hours, minutes } = parseTime(calendar.startTime);
  const { hours: endH, minutes: endM } = parseTime(calendar.endTime);
  const mins = date.getHours() * 60 + date.getMinutes();
  const startMins = hours * 60 + minutes;
  const endMins = endH * 60 + endM;
  return mins >= startMins && mins < endMins;
}

function nextBusinessStart(date: Date, calendar: BusinessCalendarConfig): Date {
  const next = new Date(date);
  for (let i = 0; i < 366; i++) {
    if (isWorkDay(next, calendar.workDays) && !isHoliday(next, calendar.holidays)) {
      const { hours, minutes } = parseTime(calendar.startTime);
      next.setHours(hours, minutes, 0, 0);
      if (next > date) return next;
    }
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
  }
  return date;
}

export function addBusinessMinutes(
  start: Date,
  minutes: number,
  calendar: BusinessCalendarConfig
): Date {
  if (minutes <= 0) return new Date(start);

  let remaining = minutes;
  let current = new Date(start);

  if (!isWithinBusinessHours(current, calendar)) {
    current = nextBusinessStart(current, calendar);
  }

  while (remaining > 0) {
    if (!isWorkDay(current, calendar.workDays) || isHoliday(current, calendar.holidays)) {
      current = nextBusinessStart(current, calendar);
      continue;
    }

    const { hours: endH, minutes: endM } = parseTime(calendar.endTime);
    const endOfDay = new Date(current);
    endOfDay.setHours(endH, endM, 0, 0);

    const available = Math.max(0, Math.floor((endOfDay.getTime() - current.getTime()) / 60000));
    if (available === 0) {
      current.setDate(current.getDate() + 1);
      current = nextBusinessStart(current, calendar);
      continue;
    }

    const used = Math.min(remaining, available);
    remaining -= used;
    current = new Date(current.getTime() + used * 60000);

    if (remaining > 0) {
      current.setDate(current.getDate() + 1);
      current = nextBusinessStart(current, calendar);
    }
  }

  return current;
}

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
  const pauseMinutes = Math.floor((endedAt.getTime() - active.startedAt.getTime()) / 60000);

  await prisma.slaPause.update({
    where: { id: active.id },
    data: { endedAt },
  });

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return null;

  const updates: { responseDueAt?: Date; resolutionDueAt?: Date; dueAt?: Date } = {};
  if (ticket.responseDueAt) {
    updates.responseDueAt = new Date(ticket.responseDueAt.getTime() + pauseMinutes * 60000);
  }
  if (ticket.resolutionDueAt) {
    updates.resolutionDueAt = new Date(ticket.resolutionDueAt.getTime() + pauseMinutes * 60000);
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
        createdAt: { lte: threshold },
        status: { category: { in: ["open", "waiting"] } },
      },
      include: { assignee: true },
    });

    for (const ticket of tickets) {
      if (policy.escalationAction === "notify" && ticket.assigneeId) {
        await createNotification({
          userId: ticket.assigneeId,
          eventType: "sla.escalation",
          title: `SLA escalation: ${ticket.ticketNumber}`,
          body: `Response SLA breached for "${ticket.subject}"`,
          linkUrl: `/app/tickets/${ticket.id}`,
        });
      }
      escalated.push(ticket.id);
    }
  }

  return escalated;
}
