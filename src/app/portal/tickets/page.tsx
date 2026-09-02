import Link from "next/link";
import { auth } from "@/lib/auth";
import { listCustomerTickets } from "@/domain/portal";
import { Badge } from "@/components/ui/badge";

export default async function PortalTicketsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const tickets = await listCustomerTickets(session.user.id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">My Tickets</h1>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {tickets.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No tickets yet.</p>
        ) : (
          tickets.map((t) => (
            <Link key={t.id} href={`/portal/tickets/${t.id}`} className="block px-4 py-4 hover:bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-ourcloud-600">{t.ticketNumber}</span>
                <Badge color={t.status.color}>{t.status.name}</Badge>
                <Badge color={t.priority.color}>{t.priority.name}</Badge>
              </div>
              <p className="mt-1 font-medium">{t.subject}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
