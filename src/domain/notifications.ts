import { prisma } from "@/lib/prisma";

export async function createNotification(params: {
  userId: string;
  eventType: string;
  title: string;
  body: string;
  linkUrl?: string;
}) {
  const notification = await prisma.notification.create({ data: params });

  // Email stub — log in dev; integrate SMTP in Phase 2
  if (process.env.NODE_ENV === "development") {
    const user = await prisma.user.findUnique({ where: { id: params.userId } });
    console.log(`[notification:email] To: ${user?.email} — ${params.title}: ${params.body}`);
  }

  return notification;
}

export async function listNotifications(userId: string, unreadOnly = false) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function notifyTicketAssigned(ticketId: string, assigneeId: string, ticketNumber: string, subject: string) {
  return createNotification({
    userId: assigneeId,
    eventType: "ticket.assigned",
    title: `Ticket assigned: ${ticketNumber}`,
    body: subject,
    linkUrl: `/app/tickets/${ticketId}`,
  });
}

export async function notifyCustomerReply(ticketId: string, assigneeId: string | null, ticketNumber: string) {
  if (!assigneeId) return;
  return createNotification({
    userId: assigneeId,
    eventType: "customer.replied",
    title: `Customer replied: ${ticketNumber}`,
    body: "A customer has added a reply to their ticket.",
    linkUrl: `/app/tickets/${ticketId}`,
  });
}

export async function notifyAgentsTaggedInNote(params: {
  ticketId: string;
  ticketNumber: string;
  subject: string;
  notePreview: string;
  authorName: string;
  taggedUserIds: string[];
}) {
  const uniqueIds = [...new Set(params.taggedUserIds)];
  if (uniqueIds.length === 0) return;

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds }, isActive: true },
    select: { id: true, email: true, name: true },
  });

  const { sendAgentTaggedInNoteEmail, agentTicketUrl } = await import("@/domain/agent-email");
  const ticketUrl = agentTicketUrl(params.ticketId);

  await Promise.all(
    users.map(async (user) => {
      await createNotification({
        userId: user.id,
        eventType: "internal_note.tagged",
        title: `Tagged in note: ${params.ticketNumber}`,
        body: `${params.authorName} tagged you in an internal note.`,
        linkUrl: `/app/tickets/${params.ticketId}`,
      });

      await sendAgentTaggedInNoteEmail({
        to: user.email,
        name: user.name,
        ticketNumber: params.ticketNumber,
        subject: params.subject,
        authorName: params.authorName,
        notePreview: params.notePreview,
        ticketUrl,
      });
    })
  );
}
