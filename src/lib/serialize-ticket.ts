import type { getTicket } from "@/domain/tickets";

type TicketWithRelations = NonNullable<Awaited<ReturnType<typeof getTicket>>>;

/**
 * Removes staff-only content (internal notes, escalation watchers, internal activity)
 * for users without the tickets.internal_notes permission.
 */
export function redactInternal<
  T extends { internalNotes: unknown[]; watchers?: unknown[]; activities: { visibility: string }[] },
>(ticket: T, canSeeInternal: boolean): T {
  if (canSeeInternal) return ticket;
  return {
    ...ticket,
    internalNotes: [],
    watchers: [],
    activities: ticket.activities.filter((a) => a.visibility !== "internal"),
  };
}

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
    watchers: (ticket.watchers ?? []).map((w) => ({
      id: w.id,
      reason: w.reason,
      createdAt: w.createdAt.toISOString(),
      user: w.user,
      taggedBy: w.taggedBy,
    })),
  };
}
