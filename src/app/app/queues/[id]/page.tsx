import Link from "next/link";
import { auth } from "@/lib/auth";
import { getQueueTickets } from "@/domain/queues";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function QueueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const queue = await prisma.queue.findFirst({ where: { id, tenantId: session.user.tenantId } });
  if (!queue) return <p>Queue not found</p>;

  const tickets = await getQueueTickets(session.user.tenantId, id, session.user.id);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/app/queues" className="text-sm text-ourcloud-600 hover:underline">← Queues</Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{queue.name}</h1>
        <p className="text-sm text-slate-500">{tickets.length} tickets</p>
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
              <th className="px-4 py-3 text-left font-medium text-slate-600">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/app/tickets/${ticket.id}`} className="font-mono text-ourcloud-600 hover:underline">
                    {ticket.ticketNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium">{ticket.subject}</td>
                <td className="px-4 py-3 text-slate-600">{ticket.organisation.name}</td>
                <td className="px-4 py-3"><Badge color={ticket.status.color}>{ticket.status.name}</Badge></td>
                <td className="px-4 py-3"><Badge color={ticket.priority.color}>{ticket.priority.name}</Badge></td>
                <td className="px-4 py-3 text-slate-400">{formatDate(ticket.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
