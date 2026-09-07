import { getPortalBaseUrl } from "@/domain/customer-email";

export interface AgentEmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendAgentEmail(payload: AgentEmailPayload) {
  const prefix = "[agent:email]";
  console.log(`${prefix} To: ${payload.to}`);
  console.log(`${prefix} Subject: ${payload.subject}`);
  console.log(`${prefix} Body:\n${payload.text}`);
  return { sent: true, to: payload.to };
}

export async function sendAgentTaggedInNoteEmail(params: {
  to: string;
  name: string;
  ticketNumber: string;
  subject: string;
  authorName: string;
  notePreview: string;
  ticketUrl: string;
}) {
  const preview =
    params.notePreview.length > 300
      ? `${params.notePreview.slice(0, 300)}…`
      : params.notePreview;

  const text = [
    `Hi ${params.name},`,
    "",
    `${params.authorName} tagged you in an internal note on ticket ${params.ticketNumber} (${params.subject}):`,
    "",
    preview,
    "",
    `View the ticket: ${params.ticketUrl}`,
  ].join("\n");

  const html = `
    <p>Hi ${params.name},</p>
    <p><strong>${params.authorName}</strong> tagged you in an internal note on ticket <strong>${params.ticketNumber}</strong> (${params.subject}):</p>
    <blockquote style="border-left:3px solid #f59e0b;padding-left:12px;color:#444">${preview}</blockquote>
    <p><a href="${params.ticketUrl}">View ticket</a></p>
  `;

  return sendAgentEmail({
    to: params.to,
    subject: `You were tagged on ${params.ticketNumber}`,
    text,
    html,
  });
}

export function agentTicketUrl(ticketId: string) {
  return `${getPortalBaseUrl()}/app/tickets/${ticketId}`;
}
