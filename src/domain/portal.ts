import { prisma } from "@/lib/prisma";
import { createTicket } from "@/domain/tickets";
import { addComment } from "@/domain/comments";
import { notifyCustomerReply } from "@/domain/notifications";
import { createGuestAccess } from "@/domain/guest-portal";
import { guestTicketUrl, sendTicketCreatedEmail } from "@/domain/customer-email";

export async function getCustomerContact(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { contact: { include: { organisation: true } } },
  });
  return user?.contact ?? null;
}

export async function listCustomerTickets(userId: string) {
  const contact = await getCustomerContact(userId);
  if (!contact) return [];

  return prisma.ticket.findMany({
    where: {
      contactId: contact.id,
      deletedAt: null,
      ticketType: { visibleInPortal: true },
    },
    include: { status: true, priority: true, ticketType: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCustomerTicket(userId: string, ticketId: string) {
  const contact = await getCustomerContact(userId);
  if (!contact) return null;

  return prisma.ticket.findFirst({
    where: {
      id: ticketId,
      contactId: contact.id,
      deletedAt: null,
    },
    include: {
      status: true,
      priority: true,
      ticketType: true,
      comments: {
        include: { author: true, onBehalfOfContact: true },
        orderBy: { createdAt: "asc" },
      },
      activities: {
        where: { visibility: "customer" },
        orderBy: { createdAt: "asc" },
      },
      attachments: true,
    },
  });
}

export async function createCustomerTicket(
  userId: string,
  tenantId: string,
  data: { subject: string; description: string; priorityId: string; ticketTypeId: string }
) {
  const contact = await getCustomerContact(userId);
  if (!contact) throw new Error("No contact linked to user");

  const ticket = await createTicket({
    tenantId,
    createdById: userId,
    subject: data.subject,
    description: data.description,
    organisationId: contact.organisationId,
    contactId: contact.id,
    priorityId: data.priorityId,
    ticketTypeId: data.ticketTypeId,
    source: "portal",
  });

  const access = await createGuestAccess(ticket.id, contact.email);
  await sendTicketCreatedEmail({
    to: contact.email,
    name: contact.name,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    accessUrl: guestTicketUrl(access.token),
  });

  return ticket;
}

export async function addCustomerReply(ticketId: string, userId: string, body: string) {
  const ticket = await getCustomerTicket(userId, ticketId);
  if (!ticket) throw new Error("Ticket not found");

  const comment = await addComment(ticketId, userId, body);
  if (ticket.assigneeId) {
    await notifyCustomerReply(ticketId, ticket.assigneeId, ticket.ticketNumber);
  }
  return comment;
}
