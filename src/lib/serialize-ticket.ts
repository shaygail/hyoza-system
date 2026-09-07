import type { getTicket } from "@/domain/tickets";

type TicketWithRelations = NonNullable<Awaited<ReturnType<typeof getTicket>>>;

export function serializeTicketForClient(ticket: TicketWithRelations) {
  return {
    ...ticket,
    resolutionDueAt: ticket.resolutionDueAt?.toISOString() ?? null,
    responseDueAt: ticket.responseDueAt?.toISOString() ?? null,
    dueAt: ticket.dueAt?.toISOString() ?? null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    comments: ticket.comments.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      onBehalfOfContact: c.onBehalfOfContact,
    })),
    internalNotes: ticket.internalNotes.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
      taggedUsers: n.tags.map((t) => t.user),
    })),
    attachments: ticket.attachments.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
    activities: ticket.activities.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
    timeEntries: ticket.timeEntries?.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
  };
}
