import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function getContactWithUser(contactId: string, tenantId: string) {
  return prisma.contact.findFirst({
    where: { id: contactId, tenantId },
    include: { user: true, organisation: true },
  });
}

export async function enableContactPortalAccess(
  contactId: string,
  tenantId: string,
  password?: string
) {
  const contact = await getContactWithUser(contactId, tenantId);
  if (!contact) throw new Error("Contact not found");

  if (contact.user) {
    await prisma.contact.update({
      where: { id: contactId },
      data: { portalAccess: true },
    });
    return contact.user;
  }

  const customerRole = await prisma.role.findFirst({
    where: { tenantId, code: "customer" },
  });
  if (!customerRole) throw new Error("Customer role not configured");

  const existingEmail = await prisma.user.findFirst({
    where: { tenantId, email: contact.email },
  });
  if (existingEmail) throw new Error("A user with this email already exists");

  const tempPassword = password ?? `Welcome${Math.random().toString(36).slice(2, 8)}!`;
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: contact.email,
      passwordHash,
      name: contact.name,
      contactId: contact.id,
      userRoles: { create: { roleId: customerRole.id } },
    },
  });

  await prisma.contact.update({
    where: { id: contactId },
    data: { portalAccess: true },
  });

  return { user, tempPassword };
}

export async function getContactUserForTicket(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      contact: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  return ticket?.contact ?? null;
}
