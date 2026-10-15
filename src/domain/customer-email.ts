import { randomBytes } from "crypto";
import { escapeHtml as e, sendMail } from "@/lib/mailer";

export function getPortalBaseUrl() {
  return (
    process.env.PORTAL_BASE_URL ??
    process.env.NEXTAUTH_URL ??
    "http://127.0.0.1:4317"
  ).replace(/\/$/, "");
}

export function guestTicketUrl(token: string) {
  return `${getPortalBaseUrl()}/support/ticket/${token}`;
}

export interface CustomerEmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendCustomerEmail(payload: CustomerEmailPayload) {
  return sendMail(payload, "[customer:email]");
}

/** Subject tag used to thread email replies back onto the ticket, e.g. "[OCSD-1234]". */
export function ticketSubjectTag(ticketNumber: string) {
  return `[${ticketNumber}]`;
}

const REPLY_ABOVE_LINE = "Reply above this line to add to your ticket.";

export async function sendTicketCreatedEmail(params: {
  to: string;
  name: string;
  ticketNumber: string;
  subject: string;
  accessUrl: string;
}) {
  const text = [
    `Hi ${params.name},`,
    "",
    `We've received your support request (${params.ticketNumber}).`,
    "",
    `Subject: ${params.subject}`,
    "",
    `Track your ticket and reply here (no sign-in required):`,
    params.accessUrl,
    "",
    "We'll email you when there are updates. You can also reply to this email.",
  ].join("\n");

  const html = `
    <p>Hi ${e(params.name)},</p>
    <p>We've received your support request <strong>${e(params.ticketNumber)}</strong>.</p>
    <p><strong>Subject:</strong> ${e(params.subject)}</p>
    <p><a href="${e(params.accessUrl)}">View your ticket and reply</a> — no sign-in required, or just reply to this email.</p>
    <p>We'll email you when there are updates.</p>
  `;

  return sendCustomerEmail({
    to: params.to,
    subject: `${ticketSubjectTag(params.ticketNumber)} Ticket created: ${params.subject}`,
    text,
    html,
  });
}

export async function sendTicketReplyEmail(params: {
  to: string;
  name: string;
  ticketNumber: string;
  subject: string;
  replyPreview: string;
  accessUrl: string;
}) {
  const text = [
    REPLY_ABOVE_LINE,
    "",
    `Hi ${params.name},`,
    "",
    `There's a new reply on your ticket ${params.ticketNumber} (${params.subject}):`,
    "",
    params.replyPreview,
    "",
    `View the full conversation: ${params.accessUrl}`,
  ].join("\n");

  return sendCustomerEmail({
    to: params.to,
    subject: `${ticketSubjectTag(params.ticketNumber)} New reply: ${params.subject}`,
    text,
    html: `<p style="color:#888">${REPLY_ABOVE_LINE}</p>
      <p>Hi ${e(params.name)},</p>
      <p>There's a new reply on <strong>${e(params.ticketNumber)}</strong>:</p>
      <blockquote style="white-space:pre-wrap">${e(params.replyPreview)}</blockquote>
      <p><a href="${e(params.accessUrl)}">View your ticket</a></p>`,
  });
}

export async function sendTicketStatusEmail(params: {
  to: string;
  name: string;
  ticketNumber: string;
  subject: string;
  statusName: string;
  accessUrl: string;
}) {
  const text = [
    `Hi ${params.name},`,
    "",
    `Your ticket ${params.ticketNumber} (${params.subject}) is now: ${params.statusName}.`,
    "",
    `View details: ${params.accessUrl}`,
  ].join("\n");

  return sendCustomerEmail({
    to: params.to,
    subject: `${ticketSubjectTag(params.ticketNumber)} ${params.statusName}: ${params.subject}`,
    text,
    html: `<p>Hi ${e(params.name)},</p>
      <p>Your ticket <strong>${e(params.ticketNumber)}</strong> is now: <strong>${e(params.statusName)}</strong>.</p>
      <p><a href="${e(params.accessUrl)}">View your ticket</a></p>`,
  });
}

export function generateGuestToken() {
  return randomBytes(24).toString("hex");
}
