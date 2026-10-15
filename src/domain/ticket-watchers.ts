import { prisma } from "@/lib/prisma";
import { logActivity } from "@/domain/activity";
import { createNotification } from "@/domain/notifications";
import { sendAgentEmail, agentTicketUrl } from "@/domain/agent-email";
import { escapeHtml as e } from "@/lib/mailer";

async function staffUserIds(userIds: string[]) {
  const staff = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      isActive: true,
      NOT: { userRoles: { some: { role: { code: "customer" } } } },
    },
    select: { id: true, name: true, email: true },
  });
  return staff;
}

export async function listTicketWatchers(ticketId: string) {
  return prisma.ticketWatcher.findMany({
    where: { ticketId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      taggedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function tagTicketWatchers(params: {
  tenantId: string;
  ticketId: string;
  taggedById: string;
  userIds: string[];
  reason?: string;
  notify?: boolean;
  /** When false, skip activity log (e.g. tagging via an internal note that already logs). */
  recordActivity?: boolean;
}) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: params.ticketId, tenantId: params.tenantId },
  });
  if (!ticket) throw new Error("Ticket not found");

  const reason = params.reason ?? "escalation";
  const staff = await staffUserIds([...new Set(params.userIds)]);
  const added: { id: string; name: string; email: string }[] = [];

  for (const user of staff) {
    const existing = await prisma.ticketWatcher.findUnique({
      where: { ticketId_userId: { ticketId: params.ticketId, userId: user.id } },
    });
    if (existing) continue;

    await prisma.ticketWatcher.create({
      data: {
        ticketId: params.ticketId,
        userId: user.id,
        taggedById: params.taggedById,
        reason,
      },
    });
    added.push(user);
  }

  if (added.length > 0) {
    const tagger = await prisma.user.findUnique({
      where: { id: params.taggedById },
      select: { name: true },
    });

    if (params.recordActivity !== false) {
      await logActivity({
        ticketId: params.ticketId,
        actorId: params.taggedById,
        eventType: "ticket.watchers_tagged",
        payload: {
          reason,
          users: added.map((u) => u.email),
          count: added.length,
        },
        visibility: "internal",
      });
    }

    if (params.notify !== false) {
      await notifyTicketWatchers({
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        authorName: tagger?.name ?? "An agent",
        reason,
        users: added,
      });
    }
  }

  return listTicketWatchers(params.ticketId);
}

export async function removeTicketWatcher(params: {
  tenantId: string;
  ticketId: string;
  userId: string;
  actorId: string;
}) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: params.ticketId, tenantId: params.tenantId },
  });
  if (!ticket) throw new Error("Ticket not found");

  await prisma.ticketWatcher.deleteMany({
    where: { ticketId: params.ticketId, userId: params.userId },
  });

  await logActivity({
    ticketId: params.ticketId,
    actorId: params.actorId,
    eventType: "ticket.watcher_removed",
    payload: { userId: params.userId },
    visibility: "internal",
  });

  return listTicketWatchers(params.ticketId);
}

export async function notifyTicketWatchers(params: {
  ticketId: string;
  ticketNumber: string;
  subject: string;
  authorName: string;
  reason: string;
  users: { id: string; name: string; email: string }[];
}) {
  const ticketUrl = agentTicketUrl(params.ticketId);
  const reasonLabel =
    params.reason === "escalation"
      ? "tagged you to check this escalated ticket"
      : `tagged you on this ticket (${params.reason})`;

  await Promise.all(
    params.users.map(async (user) => {
      await createNotification({
        userId: user.id,
        eventType: "ticket.watcher_tagged",
        title: `Review needed: ${params.ticketNumber}`,
        body: `${params.authorName} ${reasonLabel}: ${params.subject}`,
        linkUrl: `/app/tickets/${params.ticketId}`,
      });

      await sendAgentEmail({
        to: user.email,
        subject: `Escalation review: ${params.ticketNumber}`,
        text: [
          `Hi ${user.name},`,
          "",
          `${params.authorName} ${reasonLabel}.`,
          "",
          `Ticket: ${params.ticketNumber}`,
          `Subject: ${params.subject}`,
          "",
          `Open ticket: ${ticketUrl}`,
        ].join("\n"),
        html: `<p>Hi ${e(user.name)},</p>
          <p><strong>${e(params.authorName)}</strong> ${e(reasonLabel)}.</p>
          <p><strong>${e(params.ticketNumber)}</strong> — ${e(params.subject)}</p>
          <p><a href="${e(ticketUrl)}">Open ticket</a></p>`,
      });
    })
  );
}

/** Notify existing watchers (and optionally assignee) on SLA breach. */
export async function notifyWatchersOfSlaEscalation(ticket: {
  id: string;
  ticketNumber: string;
  subject: string;
  assigneeId: string | null;
}) {
  const watchers = await prisma.ticketWatcher.findMany({
    where: { ticketId: ticket.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const recipientIds = new Set<string>();
  if (ticket.assigneeId) recipientIds.add(ticket.assigneeId);
  for (const w of watchers) recipientIds.add(w.userId);

  const users = await prisma.user.findMany({
    where: { id: { in: [...recipientIds] }, isActive: true },
    select: { id: true, name: true, email: true },
  });

  const ticketUrl = agentTicketUrl(ticket.id);

  await Promise.all(
    users.map(async (user) => {
      await createNotification({
        userId: user.id,
        eventType: "sla.escalation",
        title: `SLA escalation: ${ticket.ticketNumber}`,
        body: `Response SLA breached for "${ticket.subject}" — please check this ticket.`,
        linkUrl: `/app/tickets/${ticket.id}`,
      });

      await sendAgentEmail({
        to: user.email,
        subject: `SLA escalation: ${ticket.ticketNumber}`,
        text: [
          `Hi ${user.name},`,
          "",
          `SLA has escalated on ticket ${ticket.ticketNumber}.`,
          `Subject: ${ticket.subject}`,
          "",
          `Please review: ${ticketUrl}`,
        ].join("\n"),
      });
    })
  );
}
