import type { Transporter } from "nodemailer";

/**
 * Outbound mail transport.
 *
 * If SMTP_HOST is set, mail is sent via SMTP (nodemailer). Otherwise messages are
 * logged to the console, which keeps local development working with no setup.
 *
 * Env:
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE ("true" for implicit TLS / 465),
 *   SMTP_USER, SMTP_PASSWORD, MAIL_FROM (e.g. "Support <support@example.com>")
 */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface MailResult {
  sent: boolean;
  to: string;
  transport: "smtp" | "console";
  messageId?: string;
  error?: string;
}

let transporter: Transporter | null = null;

export function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

export function mailFromAddress() {
  return process.env.MAIL_FROM ?? process.env.SMTP_USER ?? "support@localhost";
}

async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter;
  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT ?? 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? "" }
      : undefined,
  });
  return transporter;
}

export async function sendMail(message: MailMessage, logPrefix = "[email]"): Promise<MailResult> {
  // Mark our own mail as automated so well-behaved auto-responders don't reply (RFC 3834).
  const headers = { "Auto-Submitted": "auto-generated", ...message.headers };

  if (!isSmtpConfigured()) {
    console.log(`${logPrefix} To: ${message.to}`);
    console.log(`${logPrefix} Subject: ${message.subject}`);
    console.log(`${logPrefix} Body:\n${message.text}`);
    return { sent: true, to: message.to, transport: "console" };
  }

  try {
    const info = await (await getTransporter()).sendMail({
      from: mailFromAddress(),
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo ?? process.env.MAIL_REPLY_TO,
      headers,
    });
    return { sent: true, to: message.to, transport: "smtp", messageId: info.messageId };
  } catch (err) {
    // Never let a mail failure break the ticket operation that triggered it.
    console.error(`${logPrefix} SMTP send failed to ${message.to}:`, err);
    return { sent: false, to: message.to, transport: "smtp", error: (err as Error).message };
  }
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape user-supplied text before interpolating it into an HTML email. */
export function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
