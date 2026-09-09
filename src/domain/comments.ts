import { prisma } from "@/lib/prisma";
import { logActivity } from "@/domain/activity";

export async function addComment(
  ticketId: string,
  authorId: string,
  body: string,
  options?: { actingAgentId?: string; onBehalfOfContactId?: string }
) {
  const comment = await prisma.ticketComment.create({
    data: {
      ticketId,
      authorId,
      body,
      onBehalfOfContactId: options?.onBehalfOfContactId,
      actingAgentId: options?.actingAgentId,
    },
    include: { author: true, onBehalfOfContact: true },
  });

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (ticket && !ticket.firstResponseAt && !options?.onBehalfOfContactId) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { firstResponseAt: new Date() },
    });
  }

  await logActivity({
    ticketId,
    actorId: options?.actingAgentId ?? authorId,
    eventType: options?.onBehalfOfContactId ? "comment.added_on_behalf" : "comment.added",
    payload: options?.onBehalfOfContactId
      ? { contactName: comment.onBehalfOfContact?.name, agentPosted: true }
      : {},
    visibility: "customer",
  });

  if (!options?.onBehalfOfContactId) {
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      include: { userRoles: { include: { role: true } } },
    });
    const isCustomer = author?.userRoles.some((ur) => ur.role.code === "customer");
    if (!isCustomer) {
      const { notifyCustomerOfAgentReply } = await import("@/domain/guest-portal");
      await notifyCustomerOfAgentReply(ticketId, body);
    }
  }

  return comment;
}

export async function addCommentAsContact(
  ticketId: string,
  agentId: string,
  body: string
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { contact: { include: { user: true } } },
  });
  if (!ticket) throw new Error("Ticket not found");
  if (!ticket.contact) throw new Error("Ticket has no contact — assign a contact before replying as customer.");

  const contactUser = ticket.contact.user;
  const authorId = contactUser?.id ?? agentId;

  return addComment(ticketId, authorId, body, {
    actingAgentId: agentId,
    onBehalfOfContactId: ticket.contact.id,
  });
}

export async function addInternalNote(
  ticketId: string,
  authorId: string,
  body: string,
  options?: { taggedUserIds?: string[] }
) {
  const requestedIds = [...new Set(options?.taggedUserIds ?? [])];
  let taggedUserIds: string[] = [];

  if (requestedIds.length > 0) {
    const staff = await prisma.user.findMany({
      where: {
        id: { in: requestedIds },
        isActive: true,
        NOT: { userRoles: { some: { role: { code: "customer" } } } },
      },
      select: { id: true },
    });
    taggedUserIds = staff.map((u) => u.id);
  }

  const note = await prisma.ticketInternalNote.create({
    data: {
      ticketId,
      authorId,
      body,
      ...(taggedUserIds.length > 0
        ? { tags: { create: taggedUserIds.map((userId) => ({ userId })) } }
        : {}),
    },
    include: {
      author: true,
      tags: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  await logActivity({
    ticketId,
    actorId: authorId,
    eventType: "internal_note.added",
    payload: taggedUserIds.length > 0 ? { taggedCount: taggedUserIds.length } : {},
    visibility: "internal",
  });

  if (taggedUserIds.length > 0) {
    const [ticket, author] = await Promise.all([
      prisma.ticket.findUnique({ where: { id: ticketId } }),
      prisma.user.findUnique({ where: { id: authorId }, select: { name: true } }),
    ]);

    if (ticket) {
      const { notifyAgentsTaggedInNote } = await import("@/domain/notifications");
      await notifyAgentsTaggedInNote({
        ticketId,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        notePreview: body,
        authorName: author?.name ?? "An agent",
        taggedUserIds: taggedUserIds.filter((id) => id !== authorId),
      });

      // Jira-style: mention/tag on a note also adds them as ticket reviewers
      const { tagTicketWatchers } = await import("@/domain/ticket-watchers");
      await tagTicketWatchers({
        tenantId: ticket.tenantId,
        ticketId,
        taggedById: authorId,
        userIds: taggedUserIds,
        reason: "escalation",
        notify: false,
        recordActivity: false,
      });
    }
  }

  return note;
}
