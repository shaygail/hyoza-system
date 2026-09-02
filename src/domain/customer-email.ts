import { randomBytes } from "crypto";

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
  // Dev: log to console. Production: wire SMTP in Phase 2.
  const prefix = process.env.NODE_ENV === "development" ? "[customer:email]" : "[customer:email]";
  console.log(`${prefix} To: ${payload.to}`);
  console.log(`${prefix} Subject: ${payload.subject}`);
  console.log(`${prefix} Body:\n${payload.text}`);
  return { sent: true, to: payload.to };
}

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
    "We'll email you when there are updates.",
  ].join("\n");

  const html = `
    <p>Hi ${params.name},</p>
    <p>We've received your support request <strong>${params.ticketNumber}</strong>.</p>
    <p><strong>Subject:</strong> ${params.subject}</p>
    <p><a href="${params.accessUrl}">View your ticket and reply</a> — no sign-in required.</p>
    <p>We'll email you when there are updates.</p>
  `;

  return sendCustomerEmail({
    to: params.to,
    subject: `Ticket created: ${params.ticketNumber}`,
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
    subject: `New reply on ${params.ticketNumber}`,
    text,
    html: `<p>Hi ${params.name},</p>
      <p>There's a new reply on <strong>${params.ticketNumber}</strong>:</p>
      <blockquote>${params.replyPreview}</blockquote>
      <p><a href="${params.accessUrl}">View your ticket</a></p>`,
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
    subject: `Ticket ${params.ticketNumber} — ${params.statusName}`,
    text,
    html: `<p>Hi ${params.name},</p>
      <p>Your ticket <strong>${params.ticketNumber}</strong> is now: <strong>${params.statusName}</strong>.</p>
      <p><a href="${params.accessUrl}">View your ticket</a></p>`,
  });
}

export function generateGuestToken() {
  return randomBytes(24).toString("hex");
}
