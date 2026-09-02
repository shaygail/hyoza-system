import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/domain/tickets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const stats = await getDashboardStats(session.user.tenantId, session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Good morning, {session.user.name?.split(" ")[0]}
          </h1>
          <p className="text-sm text-slate-500">Here&apos;s your service desk overview</p>
        </div>
        <Link href="/app/tickets/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="My Open Tickets" value={stats.myOpen} href="/app/tickets?view=my" />
        <StatCard label="Unassigned" value={stats.unassigned} href="/app/tickets?view=unassigned" />
        <StatCard label="SLA At Risk" value={stats.slaAtRisk.length} href="/app/queues" alert />
        <StatCard label="Recently Updated" value={stats.recent.length} href="/app/tickets" />
      </div>

      {stats.slaAtRisk.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50">
          <div className="border-b border-red-200 px-4 py-3">
            <h2 className="font-medium text-red-800">SLA At Risk</h2>
          </div>
          <div className="divide-y divide-red-100">
            {stats.slaAtRisk.map((ticket) => (
              <Link key={ticket.id} href={`/app/tickets/${ticket.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-red-100/50">
                <div>
                  <span className="font-mono text-xs text-red-600">{ticket.ticketNumber}</span>
                  <p className="text-sm font-medium text-red-900">{ticket.subject}</p>
                </div>
                {ticket.resolutionDueAt && (
                  <span className="text-xs text-red-600">Due {formatDate(ticket.resolutionDueAt)}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-medium text-slate-900">My Open Tickets</h2>
        </div>
        {stats.myTickets.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No open tickets assigned to you.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {stats.myTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/app/tickets/${ticket.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">{ticket.ticketNumber}</span>
                    <Badge color={ticket.status.color}>{ticket.status.name}</Badge>
                    <Badge color={ticket.priority.color}>{ticket.priority.name}</Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-900">{ticket.subject}</p>
                  <p className="text-xs text-slate-500">{ticket.organisation.name}</p>
                </div>
                <span className="text-xs text-slate-400">{formatDate(ticket.updatedAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, href, alert }: { label: string; value: number; href: string; alert?: boolean }) {
  return (
    <Link href={href} className={`rounded-xl border bg-white p-6 transition-colors ${alert && value > 0 ? "border-red-200 hover:border-red-300" : "border-slate-200 hover:border-ourcloud-200"}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${alert && value > 0 ? "text-red-600" : "text-ourcloud-700"}`}>{value}</p>
    </Link>
  );
}
