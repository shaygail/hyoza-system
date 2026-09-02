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
  if (!ticket.contact) throw new Error("Ticket has no contact");

  const contactUser = ticket.contact.user;
  if (!contactUser) {
    throw new Error(
      "Contact does not have portal access. Enable it in Customers → contact → Portal Access."
    );
  }

  return addComment(ticketId, contactUser.id, body, {
    actingAgentId: agentId,
    onBehalfOfContactId: ticket.contact.id,
  });
}

export async function addInternalNote(ticketId: string, authorId: string, body: string) {
  const note = await prisma.ticketInternalNote.create({
    data: { ticketId, authorId, body },
    include: { author: true },
  });

  await logActivity({
    ticketId,
    actorId: authorId,
    eventType: "internal_note.added",
    visibility: "internal",
  });

  return note;
}
