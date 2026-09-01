import Link from "next/link";
import { auth } from "@/lib/auth";
import { listTickets } from "@/domain/tickets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";
import type { TicketView } from "@/domain/tickets";

const views: { key: TicketView; label: string }[] = [
  { key: "all", label: "All Tickets" },
  { key: "my", label: "My Tickets" },
  { key: "unassigned", label: "Unassigned" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "waiting", label: "Waiting" },
  { key: "resolved", label: "Resolved" },
];

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const params = await searchParams;
  const view = (params.view as TicketView) || "all";
  const tickets = await listTickets(session.user.tenantId, view, session.user.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Tickets</h1>
        <Link href="/app/tickets/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {views.map((v) => (
          <Link
            key={v.key}
            href={`/app/tickets?view=${v.key}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === v.key
                ? "bg-ourcloud-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">#</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Subject</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Priority</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Agent</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No tickets found for this view.
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/app/tickets/${ticket.id}`} className="font-mono text-ourcloud-600 hover:underline">
                      {ticket.ticketNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/app/tickets/${ticket.id}`} className="font-medium text-slate-900 hover:text-ourcloud-600">
                      {ticket.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{ticket.organisation.name}</td>
                  <td className="px-4 py-3">
                    <Badge color={ticket.status.color}>{ticket.status.name}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={ticket.priority.color}>{ticket.priority.name}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{ticket.assignee?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(ticket.updatedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
