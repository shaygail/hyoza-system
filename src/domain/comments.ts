import { prisma } from "@/lib/prisma";
import { logActivity } from "@/domain/activity";

export async function addComment(ticketId: string, authorId: string, body: string) {
  const comment = await prisma.ticketComment.create({
    data: { ticketId, authorId, body },
    include: { author: true },
  });

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (ticket && !ticket.firstResponseAt) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { firstResponseAt: new Date() },
    });
  }

  await logActivity({
    ticketId,
    actorId: authorId,
    eventType: "comment.added",
    visibility: "customer",
  });

  return comment;
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
