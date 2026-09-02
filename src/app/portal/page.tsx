import Link from "next/link";
import { auth } from "@/lib/auth";
import { listCustomerTickets, getCustomerContact } from "@/domain/portal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

export default async function PortalHomePage() {
  const session = await auth();
  if (!session?.user) return null;

  const contact = await getCustomerContact(session.user.id);
  const tickets = await listCustomerTickets(session.user.id);
  const openCount = tickets.filter((t) => t.status.category === "open" || t.status.category === "waiting").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Welcome, {contact?.name ?? session.user.name}
          </h1>
          <p className="text-sm text-slate-500">{contact?.organisation.name} Support</p>
        </div>
        <Link href="/portal/tickets/new">
          <Button><Plus className="mr-2 h-4 w-4" />Create Ticket</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Open Tickets</p>
          <p className="mt-2 text-3xl font-semibold text-ourcloud-700">{openCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Total Tickets</p>
          <p className="mt-2 text-3xl font-semibold text-slate-700">{tickets.length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 font-medium">Recent Tickets</div>
        <div className="divide-y divide-slate-100">
          {tickets.slice(0, 5).map((t) => (
            <Link key={t.id} href={`/portal/tickets/${t.id}`} className="block px-4 py-3 hover:bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-400">{t.ticketNumber}</span>
                <Badge color={t.status.color}>{t.status.name}</Badge>
              </div>
              <p className="mt-1 text-sm font-medium">{t.subject}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
