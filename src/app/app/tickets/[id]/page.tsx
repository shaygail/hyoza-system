import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTicket, getAvailableTransitions, listTicketsForContact } from "@/domain/tickets";
import { listRoutingCategories } from "@/domain/routing";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { redactInternal, serializeTicketForClient } from "@/lib/serialize-ticket";
import { getTicketBillingSummary } from "@/domain/finance";
import { TicketDetailClient } from "@/components/tickets/ticket-detail";
import { TicketBillingSummary } from "@/components/finance/ticket-billing-summary";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const [canEdit, canSeeInternal, canViewBilling] = await Promise.all([
    hasPermission(session.user.id, "tickets.edit"),
    hasPermission(session.user.id, "tickets.internal_notes"),
    hasPermission(session.user.id, "billing.view"),
  ]);

  // Finance users get a billing summary instead of the service desk issue view.
  if (!canEdit && canViewBilling) {
    const summary = await getTicketBillingSummary(session.user.tenantId, id);
    if (!summary) notFound();
    return <TicketBillingSummary ticket={summary} />;
  }

  const ticket = await getTicket(session.user.tenantId, id);
  if (!ticket) notFound();

  const [transitions, technicians, priorities, routingCategories, contactTickets] = await Promise.all([
    getAvailableTransitions(id),
    prisma.user.findMany({
      where: {
        tenantId: session.user.tenantId,
        isActive: true,
        NOT: { userRoles: { some: { role: { code: "customer" } } } },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.priority.findMany({ where: { tenantId: session.user.tenantId }, select: { id: true, name: true } }),
    listRoutingCategories(session.user.tenantId),
    ticket.contactId
      ? listTicketsForContact(session.user.tenantId, ticket.contactId, { excludeTicketId: ticket.id })
      : Promise.resolve([]),
  ]);

  const serialized = redactInternal(serializeTicketForClient(ticket), canSeeInternal);
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
      metadata={{
        technicians,
        priorities,
        routingCategories,
        currentUserName: session.user.name ?? "Agent",
        currentUserId: session.user.id,
      }}
      relatedTickets={relatedTickets}
    />
  );
}
