import Link from "next/link";
import { auth } from "@/lib/auth";
import { listCustomerTickets } from "@/domain/portal";
import { Badge } from "@/components/ui/badge";
import { PriorityLabel } from "@/components/ui/jira";

export default async function PortalTicketsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const tickets = await listCustomerTickets(session.user.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Requests</h1>
        <Link
          href="/portal/tickets/new"
          className="inline-flex h-8 items-center rounded-[3px] bg-ourcloud-600 px-3 text-sm font-medium text-white hover:bg-ourcloud-700"
        >
          Raise a request
        </Link>
      </div>
      <div className="overflow-x-auto rounded-[4px] bg-white shadow-card">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b-2 border-slate-200">
            <tr className="text-left text-xs font-semibold text-slate-500">
              <th className="w-28 px-4 py-2">Reference</th>
              <th className="px-4 py-2">Summary</th>
              <th className="w-32 px-4 py-2">Priority</th>
              <th className="w-44 px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No requests yet.
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id} className="h-11 border-b border-slate-200 last:border-0 hover:bg-slate-50">
                  <td className="px-4">
                    <Link href={`/portal/tickets/${t.id}`} className="text-ourcloud-700 hover:underline">
                      {t.ticketNumber}
                    </Link>
                  </td>
                  <td className="px-4">
                    <Link href={`/portal/tickets/${t.id}`} className="text-slate-900 hover:underline">
                      {t.subject}
                    </Link>
                  </td>
                  <td className="px-4">
                    <PriorityLabel name={t.priority.name} />
                  </td>
                  <td className="px-4">
                    <Badge color={t.status.color}>{t.status.name}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
