import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTicket, getAvailableTransitions, listTicketsForContact } from "@/domain/tickets";
import { prisma } from "@/lib/prisma";
import { serializeTicketForClient } from "@/lib/serialize-ticket";
import { TicketDetailClient } from "@/components/tickets/ticket-detail";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const ticket = await getTicket(session.user.tenantId, id);
  if (!ticket) notFound();

  const [transitions, users, priorities, contactTickets] = await Promise.all([
    getAvailableTransitions(id),
    prisma.user.findMany({ where: { tenantId: session.user.tenantId, isActive: true }, select: { id: true, name: true } }),
    prisma.priority.findMany({ where: { tenantId: session.user.tenantId }, select: { id: true, name: true } }),
    ticket.contactId
      ? listTicketsForContact(session.user.tenantId, ticket.contactId, { excludeTicketId: ticket.id })
      : Promise.resolve([]),
  ]);

  const serialized = serializeTicketForClient(ticket);
  const relatedTickets = contactTickets.map((t) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <TicketDetailClient
      ticket={serialized as Parameters<typeof TicketDetailClient>[0]["ticket"]}
      transitions={transitions.map((t) => ({ ...t, requiredFields: t.requiredFields }))}
      metadata={{ users, priorities, currentUserName: session.user.name ?? "Agent" }}
      relatedTickets={relatedTickets}
    />
  );
}
