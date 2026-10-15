import { prisma } from "@/lib/prisma";
import { createTicket } from "@/domain/tickets";
import { addComment } from "@/domain/comments";
import { runAutomationRules } from "@/domain/automation";
import { notifyCustomerReply } from "@/domain/notifications";
import { mailFromAddress } from "@/lib/mailer";
import {
  emailDomain,
  extractTicketNumber,
  normalizeSubject,
  PUBLIC_EMAIL_DOMAINS,
  stripQuotedReply,
} from "@/domain/email-threading";

export interface InboundEmailInput {
  messageId: string;
  fromAddress: string;
  fromName?: string;
  subject: string;
  body: string;
  /** Set by the IMAP fetcher when the message is an auto-reply / bounce. */
  isAutomated?: boolean;
}

export async function ingestInboundEmail(mailboxId: string, data: InboundEmailInput) {
  const mailbox = await prisma.emailMailbox.findUnique({
    where: { id: mailboxId },
    include: { organisation: true },
  });
  if (!mailbox || !mailbox.isActive) throw new Error("Mailbox not found or inactive");

  const existing = await prisma.inboundEmail.findUnique({
    where: { mailboxId_messageId: { mailboxId, messageId: data.messageId } },
  });
  if (existing) return { email: existing, ticket: null, duplicate: true };

  const fromAddress = data.fromAddress.trim().toLowerCase();
  const isLoop =
    fromAddress === mailbox.emailAddress.toLowerCase() ||
    fromAddress === extractAddress(mailFromAddress());

  const email = await prisma.inboundEmail.create({
    data: {
      mailboxId,
      messageId: data.messageId,
      fromAddress,
      fromName: data.fromName,
      subject: data.subject,
      body: data.body,
      // Auto-replies and our own mail are stored for audit but never turned into tickets.
      status: data.isAutomated || isLoop ? "ignored" : "pending",
    },
  });

  if (email.status === "ignored") return { email, ticket: null, duplicate: false, ignored: true };
  return processInboundEmail(email.id);
}

function extractAddress(value: string) {
  const m = value.match(/<([^>]+)>/);
  return (m ? m[1] : value).trim().toLowerCase();
}

async function getSystemUserId(tenantId: string) {
  const admin = await prisma.user.findFirst({
    where: { tenantId, userRoles: { some: { role: { code: "administrator" } } } },
  });
  if (!admin) throw new Error("No administrator user to own email-created tickets");
  return admin.id;
}

/**
 * Resolve the client organisation for a sender:
 *   1. the mailbox's fixed organisation (per-client mailboxes)
 *   2. an existing contact with that address
 *   3. another contact or the organisation itself sharing the sender's (non-free-mail) domain
 */
async function resolveSender(tenantId: string, mailboxOrgId: string | null, fromAddress: string) {
  const contact = await prisma.contact.findFirst({ where: { tenantId, email: fromAddress } });
  if (mailboxOrgId) {
    return {
      organisationId: mailboxOrgId,
      contact: contact?.organisationId === mailboxOrgId ? contact : null,
    };
  }
  if (contact) return { organisationId: contact.organisationId, contact };

  const domain = emailDomain(fromAddress);
  if (domain && !PUBLIC_EMAIL_DOMAINS.has(domain)) {
    const sibling = await prisma.contact.findFirst({
      where: { tenantId, email: { endsWith: `@${domain}` } },
    });
    if (sibling) return { organisationId: sibling.organisationId, contact: null };
    const org = await prisma.organisation.findFirst({
      where: { tenantId, email: { endsWith: `@${domain}` } },
    });
    if (org) return { organisationId: org.id, contact: null };
  }
  return { organisationId: null, contact: null };
}

/**
 * A sender may add to an existing ticket if they are the ticket's contact, have a
 * guest link for it, or are a contact of the same client organisation.
 */
async function senderMayReply(
  ticket: { id: string; organisationId: string; contact: { email: string } | null },
  fromAddress: string
) {
  if (ticket.contact?.email.toLowerCase() === fromAddress) return true;
  const guest = await prisma.ticketGuestAccess.findFirst({
    where: { ticketId: ticket.id, email: fromAddress },
  });
  if (guest) return true;
  const orgContact = await prisma.contact.findFirst({
    where: { organisationId: ticket.organisationId, email: fromAddress },
  });
  return Boolean(orgContact);
}

async function knownTicketPrefixes(tenantId: string) {
  const latest = await prisma.ticket.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: { ticketNumber: true },
  });
  const prefix = latest?.ticketNumber.split("-")[0];
  return prefix ? [prefix] : [];
}

export async function processInboundEmail(emailId: string) {
  const email = await prisma.inboundEmail.findUnique({
    where: { id: emailId },
    include: { mailbox: { include: { organisation: true } } },
  });
  if (!email || email.status === "processed" || email.status === "ignored") {
    return { email, ticket: null };
  }

  try {
    const tenantId = email.mailbox.tenantId;
    const fromAddress = email.fromAddress.toLowerCase();

    // 1. Reply to an existing ticket? Thread it as a customer comment.
    const ticketNumber = extractTicketNumber(email.subject, await knownTicketPrefixes(tenantId));
    let followUpOf: { id: string; ticketNumber: string } | null = null;
    if (ticketNumber) {
      const existing = await prisma.ticket.findFirst({
        where: { tenantId, ticketNumber, deletedAt: null },
        include: { contact: true, status: true },
      });
      if (existing && (await senderMayReply(existing, fromAddress))) {
        if (existing.status.category !== "closed") {
          const sender =
            (await prisma.contact.findFirst({
              where: { organisationId: existing.organisationId, email: fromAddress },
              include: { user: true },
            })) ?? null;
          const authorId = sender?.user?.id ?? (await getSystemUserId(tenantId));
          await addComment(existing.id, authorId, stripQuotedReply(email.body), {
            onBehalfOfContactId: sender?.id ?? existing.contactId ?? undefined,
          });
          if (existing.assigneeId) {
            await notifyCustomerReply(existing.id, existing.assigneeId, existing.ticketNumber);
          }
          await prisma.inboundEmail.update({
            where: { id: emailId },
            data: { status: "processed", processedAt: new Date(), ticketId: existing.id },
          });
          return { email, ticket: existing, duplicate: false, threaded: true };
        }
        // Closed tickets stay closed; the reply becomes a linked follow-up ticket.
        followUpOf = { id: existing.id, ticketNumber: existing.ticketNumber };
      }
    }

    // 2. New ticket.
    const { organisationId: resolvedOrgId, contact } = await resolveSender(
      tenantId,
      email.mailbox.organisationId,
      fromAddress
    );
    let organisationId = resolvedOrgId;
    if (!organisationId) {
      // Unknown sender: file under the tenant's designated triage organisation if one
      // is configured (Tenant.settings.unmatchedEmailOrganisationId), else the first one.
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      const settings = safeJson(tenant?.settings);
      const triageId =
        typeof settings.unmatchedEmailOrganisationId === "string"
          ? settings.unmatchedEmailOrganisationId
          : null;
      const fallback = triageId
        ? await prisma.organisation.findFirst({ where: { id: triageId, tenantId } })
        : await prisma.organisation.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } });
      if (!fallback) throw new Error("No organisation available");
      organisationId = fallback.id;
    }

    const [incidentType, mediumPriority, systemUserId] = await Promise.all([
      prisma.ticketType.findFirst({ where: { tenantId, code: "incident" } }),
      prisma.priority.findFirst({ where: { tenantId, code: "medium" } }),
      getSystemUserId(tenantId),
    ]);
    if (!incidentType || !mediumPriority) throw new Error("Missing seed data for email processing");

    const subject = normalizeSubject(email.subject) || "(no subject)";
    const ticket = await createTicket({
      tenantId,
      createdById: systemUserId,
      subject: followUpOf ? `Follow-up to ${followUpOf.ticketNumber}: ${subject}` : subject,
      description: followUpOf ? stripQuotedReply(email.body) : email.body,
      organisationId,
      contactId: contact?.id,
      priorityId: mediumPriority.id,
      ticketTypeId: incidentType.id,
      source: "email",
    });
    if (followUpOf) {
      await prisma.ticket.update({ where: { id: ticket.id }, data: { parentTicketId: followUpOf.id } });
    }

    await prisma.inboundEmail.update({
      where: { id: emailId },
      data: { status: "processed", processedAt: new Date(), ticketId: ticket.id },
    });

    await runAutomationRules(tenantId, "ticket.created", ticket.id, {
      source: "email",
      priorityCode: "medium",
      subject: email.subject,
    });

    // Acknowledge with a tracking link; the [TICKET-123] subject tag lets replies thread.
    const { createGuestAccess } = await import("@/domain/guest-portal");
    const { guestTicketUrl, sendTicketCreatedEmail } = await import("@/domain/customer-email");
    const access = await createGuestAccess(ticket.id, fromAddress);
    await sendTicketCreatedEmail({
      to: fromAddress,
      name: contact?.name ?? email.fromName ?? fromAddress,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      accessUrl: guestTicketUrl(access.token),
    });

    return { email, ticket, duplicate: false, threaded: false };
  } catch (err) {
    await prisma.inboundEmail.update({
      where: { id: emailId },
      data: { status: "failed", error: (err as Error).message.slice(0, 500) },
    });
    throw err;
  }
}

function safeJson(value: string | null | undefined): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
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
