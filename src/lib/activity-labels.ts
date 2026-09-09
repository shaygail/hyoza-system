export function getActivityLabel(eventType: string, payload: Record<string, unknown>): string {
  switch (eventType) {
    case "ticket.created":
      return "Ticket created";
    case "status.changed":
      return `Status changed from ${payload.from} to ${payload.to}`;
    case "priority.changed":
      return `Priority changed from ${payload.from} to ${payload.to}`;
    case "category.changed":
      return `Category changed from ${payload.from} to ${payload.to}`;
    case "team.changed":
      return `Team set to ${payload.team}`;
    case "ticket.assigned":
      return `Assigned to ${payload.assignee}`;
    case "ticket.reassigned":
      return `Reassigned to ${payload.assignee}`;
    case "comment.added":
      return "Agent replied";
    case "comment.added_on_behalf":
      return `Reply posted on behalf of ${payload.contactName ?? "customer"}`;
    case "customer.replied":
      return "Customer replied";
    case "internal_note.added":
      return "Internal note added";
    case "ticket.watchers_tagged": {
      const users = Array.isArray(payload.users) ? payload.users.join(", ") : "";
      const reason = payload.reason === "escalation" ? " for escalation review" : "";
      return users ? `Tagged for review${reason}: ${users}` : `Tagged staff for review${reason}`;
    }
    case "ticket.watcher_removed":
      return "Removed tagged reviewer";
    case "time_entry.added":
      return `Logged ${payload.durationMinutes ?? "?"} minutes`;
    case "attachment.uploaded":
      return `Attachment uploaded: ${payload.fileName}`;
    case "ticket.resolved":
      return "Ticket resolved";
    case "ticket.closed":
      return "Ticket closed";
    case "ticket.reopened":
      return "Ticket reopened";
    default:
      return eventType.replace(/\./g, " ");
  }
}
