import { prisma } from "@/lib/prisma";
import { createTicket } from "@/domain/tickets";
import { addComment } from "@/domain/comments";
import { notifyCustomerReply } from "@/domain/notifications";
import {
  generateGuestToken,
  guestTicketUrl,
  sendTicketCreatedEmail,
  sendTicketReplyEmail,
  sendTicketStatusEmail,
} from "@/domain/customer-email";
import { getDefaultTenant } from "@/domain/portal-public";

async function getSystemUserId(tenantId: string) {
  const admin = await prisma.user.findFirst({
    where: {
      tenantId,
      userRoles: { some: { role: { code: "administrator" } } },
    },
  });
  if (!admin) throw new Error("System user not configured");
  return admin.id;
}

export async function findOrCreateContact(
  tenantId: string,
  email: string,
  name: string
) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.contact.findFirst({
    where: { tenantId, email: normalizedEmail },
  });
  if (existing) return existing;

  let organisation = await prisma.organisation.findFirst({
    where: { tenantId, email: { contains: normalizedEmail.split("@")[1] ?? "" } },
  });

  if (!organisation) {
    organisation = await prisma.organisation.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!organisation) throw new Error("No organisation configured for new contacts");

  return prisma.contact.create({
    data: {
      tenantId,
      organisationId: organisation.id,
      name: name.trim(),
      email: normalizedEmail,
      portalAccess: false,
    },
  });
}

export async function createGuestAccess(ticketId: string, email: string) {
  const token = generateGuestToken();
  return prisma.ticketGuestAccess.create({
    data: {
      ticketId,
      email: email.trim().toLowerCase(),
      token,
    },
  });
}

export async function getGuestAccessByToken(token: string) {
  return prisma.ticketGuestAccess.findUnique({
    where: { token },
    include: {
      ticket: {
        include: {
          status: true,
          priority: true,
          ticketType: true,
          contact: true,
          comments: {
            include: { author: true, onBehalfOfContact: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
}

export async function createGuestTicket(data: {
  name: string;
  email: string;
  subject: string;
  description: string;
  priorityId?: string;
  ticketTypeId?: string;
}) {
  const tenant = await getDefaultTenant();
  if (!tenant) throw new Error("Support portal not configured");

  const contact = await findOrCreateContact(tenant.id, data.email, data.name);
  const systemUserId = await getSystemUserId(tenant.id);

  const priority =
    data.priorityId
      ? await prisma.priority.findUnique({ where: { id: data.priorityId } })
      : await prisma.priority.findFirst({ where: { tenantId: tenant.id, code: "medium" } });

  const ticketType =
    data.ticketTypeId
      ? await prisma.ticketType.findFirst({
          where: { id: data.ticketTypeId, tenantId: tenant.id, visibleInPortal: true },
        })
      : await prisma.ticketType.findFirst({
          where: { tenantId: tenant.id, visibleInPortal: true },
          orderBy: { sortOrder: "asc" },
        });

  if (!priority || !ticketType) throw new Error("Missing ticket configuration");

  const ticket = await createTicket({
    tenantId: tenant.id,
    createdById: systemUserId,
    subject: data.subject.trim(),
    description: data.description.trim(),
    organisationId: contact.organisationId,
    contactId: contact.id,
    priorityId: priority.id,
    ticketTypeId: ticketType.id,
    source: "portal",
  });

  const access = await createGuestAccess(ticket.id, data.email);
  const accessUrl = guestTicketUrl(access.token);

  await sendTicketCreatedEmail({
    to: data.email,
    name: contact.name,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    accessUrl,
  });

  return { ticket, accessToken: access.token, accessUrl };
}

export async function addGuestReply(token: string, body: string) {
  const access = await getGuestAccessByToken(token);
  if (!access) throw new Error("Invalid or expired ticket link");

  const ticket = access.ticket;
  if (ticket.deletedAt) throw new Error("Ticket not found");

  const contactUser = await prisma.user.findFirst({
    where: { contactId: ticket.contactId ?? undefined },
  });

  const authorId = contactUser?.id ?? (await getSystemUserId(ticket.tenantId));

  const comment = await addComment(ticket.id, authorId, body.trim(), {
    onBehalfOfContactId: ticket.contactId ?? undefined,
  });

  if (ticket.assigneeId) {
    await notifyCustomerReply(ticket.id, ticket.assigneeId, ticket.ticketNumber);
  }

  return comment;
}

export async function notifyCustomerOfAgentReply(ticketId: string, replyBody: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { contact: true, guestAccess: true },
  });
  if (!ticket?.contact?.email) return;

  let access = ticket.guestAccess[0];
  if (!access) {
    access = await createGuestAccess(ticket.id, ticket.contact.email);
  }

  await sendTicketReplyEmail({
    to: ticket.contact.email,
    name: ticket.contact.name,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    replyPreview: replyBody.slice(0, 280) + (replyBody.length > 280 ? "…" : ""),
    accessUrl: guestTicketUrl(access.token),
  });
}

export async function notifyCustomerOfStatusChange(
  ticketId: string,
  statusName: string
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { contact: true, guestAccess: true },
  });
  if (!ticket?.contact?.email) return;

  let access = ticket.guestAccess[0];
  if (!access) {
    access = await createGuestAccess(ticket.id, ticket.contact.email);
  }

  await sendTicketStatusEmail({
    to: ticket.contact.email,
    name: ticket.contact.name,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    statusName,
    accessUrl: guestTicketUrl(access.token),
  });
}

export async function getPublicFormOptions() {
  const tenant = await getDefaultTenant();
  if (!tenant) return null;

  const [priorities, ticketTypes] = await Promise.all([
    prisma.priority.findMany({ where: { tenantId: tenant.id }, orderBy: { sortOrder: "asc" } }),
    prisma.ticketType.findMany({
      where: { tenantId: tenant.id, visibleInPortal: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return { priorities, ticketTypes };
}

export async function listGuestTicketsForEmail(
  tenantId: string,
  email: string,
  currentToken?: string
) {
  const normalizedEmail = email.trim().toLowerCase();
  const contacts = await prisma.contact.findMany({
    where: { tenantId, email: normalizedEmail },
    select: { id: true },
  });
  const contactIds = contacts.map((c) => c.id);

  const tickets = await prisma.ticket.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ticketType: { visibleInPortal: true },
      OR: [
        ...(contactIds.length > 0 ? [{ contactId: { in: contactIds } }] : []),
        { guestAccess: { some: { email: normalizedEmail } } },
      ],
    },
    include: {
      status: true,
      priority: true,
      guestAccess: { where: { email: normalizedEmail }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const results = [];
  for (const ticket of tickets) {
    let access = ticket.guestAccess[0];
    if (!access) {
      access = await createGuestAccess(ticket.id, normalizedEmail);
    }
    results.push({
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      updatedAt: ticket.updatedAt.toISOString(),
      token: access.token,
      isCurrent: access.token === currentToken,
    });
  }

  return results;
}

export async function listGuestTicketsForToken(token: string) {
  const access = await prisma.ticketGuestAccess.findUnique({ where: { token } });
  if (!access) return null;

  const ticket = await prisma.ticket.findUnique({
    where: { id: access.ticketId },
    select: { tenantId: true, deletedAt: true },
  });
  if (!ticket || ticket.deletedAt) return null;

  const customerTickets = await listGuestTicketsForEmail(ticket.tenantId, access.email, token);
  return { email: access.email, customerTickets };
}
