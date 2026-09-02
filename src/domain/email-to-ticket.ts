import { prisma } from "@/lib/prisma";
import { createTicket } from "@/domain/tickets";
import { runAutomationRules } from "@/domain/automation";

export async function ingestInboundEmail(
  mailboxId: string,
  data: {
    messageId: string;
    fromAddress: string;
    subject: string;
    body: string;
  }
) {
  const mailbox = await prisma.emailMailbox.findUnique({
    where: { id: mailboxId },
    include: { organisation: true },
  });
  if (!mailbox || !mailbox.isActive) throw new Error("Mailbox not found or inactive");

  const existing = await prisma.inboundEmail.findUnique({
    where: { mailboxId_messageId: { mailboxId, messageId: data.messageId } },
  });
  if (existing) return { email: existing, ticket: null, duplicate: true };

  const email = await prisma.inboundEmail.create({
    data: {
      mailboxId,
      messageId: data.messageId,
      fromAddress: data.fromAddress,
      subject: data.subject,
      body: data.body,
      status: "pending",
    },
  });

  return processInboundEmail(email.id);
}

export async function processInboundEmail(emailId: string) {
  const email = await prisma.inboundEmail.findUnique({
    where: { id: emailId },
    include: { mailbox: { include: { organisation: true } } },
  });
  if (!email || email.status === "processed") {
    return { email, ticket: null };
  }

  try {
    const mailbox = email.mailbox;
    const tenantId = mailbox.tenantId;

    let organisationId = mailbox.organisationId;
    if (!organisationId) {
      const contact = await prisma.contact.findFirst({
        where: { tenantId, email: email.fromAddress },
      });
      organisationId = contact?.organisationId ?? null;
    }

    if (!organisationId) {
      const fallback = await prisma.organisation.findFirst({ where: { tenantId } });
      if (!fallback) throw new Error("No organisation available");
      organisationId = fallback.id;
    }

    const contact = await prisma.contact.findFirst({
      where: { tenantId, email: email.fromAddress, organisationId },
    });

    const incidentType = await prisma.ticketType.findFirst({
      where: { tenantId, code: "incident" },
    });
    const mediumPriority = await prisma.priority.findFirst({
      where: { tenantId, code: "medium" },
    });
    const admin = await prisma.user.findFirst({
      where: {
        tenantId,
        userRoles: { some: { role: { code: "administrator" } } },
      },
    });

    if (!incidentType || !mediumPriority || !admin) {
      throw new Error("Missing seed data for email processing");
    }

    const ticket = await createTicket({
      tenantId,
      createdById: admin.id,
      subject: email.subject || "(no subject)",
      description: email.body,
      organisationId,
      contactId: contact?.id,
      priorityId: mediumPriority.id,
      ticketTypeId: incidentType.id,
      source: "email",
    });

    await prisma.inboundEmail.update({
      where: { id: emailId },
      data: {
        status: "processed",
        processedAt: new Date(),
        ticketId: ticket.id,
      },
    });

    await runAutomationRules(tenantId, "ticket.created", ticket.id, {
      source: "email",
      priorityCode: "medium",
      subject: email.subject,
    });

    return { email, ticket, duplicate: false };
  } catch (err) {
    await prisma.inboundEmail.update({
      where: { id: emailId },
      data: { status: "failed" },
    });
    throw err;
  }
}

export async function processPendingEmails(tenantId?: string) {
  const where: Record<string, unknown> = { status: "pending" };
  if (tenantId) {
    where.mailbox = { tenantId };
  }

  const pending = await prisma.inboundEmail.findMany({
    where,
    take: 50,
    orderBy: { receivedAt: "asc" },
  });

  const results = [];
  for (const email of pending) {
    try {
      const result = await processInboundEmail(email.id);
      results.push({ emailId: email.id, success: true, ticketId: result.ticket?.id });
    } catch (e) {
      results.push({ emailId: email.id, success: false, error: (e as Error).message });
    }
  }
  return results;
}

export async function listMailboxes(tenantId: string) {
  return prisma.emailMailbox.findMany({
    where: { tenantId },
    include: { organisation: true, _count: { select: { emails: true } } },
  });
}
