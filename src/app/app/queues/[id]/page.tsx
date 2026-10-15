import Link from "next/link";
import { auth } from "@/lib/auth";
import { getQueueTickets } from "@/domain/queues";
import { prisma } from "@/lib/prisma";
import { Avatar, PriorityLabel, StatusLozenge, TypeIcon } from "@/components/ui/jira";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title={queue.name}
        description={`${tickets.length} ${tickets.length === 1 ? "ticket" : "tickets"}`}
        breadcrumbs={[{ label: "Queues", href: "/app/queues" }]}
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b-2 border-slate-200">
            <tr className="text-left text-xs font-semibold text-slate-500">
              <th className="w-10 px-2 py-2">Type</th>
              <th className="w-28 px-2 py-2">Key</th>
              <th className="px-2 py-2">Summary</th>
              <th className="px-2 py-2">Customer</th>
              <th className="px-2 py-2">Assignee</th>
              <th className="px-2 py-2">Priority</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 && (
              <tr>
                <td colSpan={8} className="px-2 py-10 text-center text-slate-500">
                  This queue is empty.
                </td>
              </tr>
            )}
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="h-10 border-b border-slate-200 hover:bg-slate-100">
                <td className="px-2">
                  <TypeIcon name={ticket.ticketType?.name} />
                </td>
                <td className="whitespace-nowrap px-2">
                  <Link href={`/app/tickets/${ticket.id}`} className="text-ourcloud-700 hover:underline">
                    {ticket.ticketNumber}
                  </Link>
                </td>
                <td className="px-2">
                  <Link
                    href={`/app/tickets/${ticket.id}`}
                    className="block min-w-[200px] max-w-[420px] truncate text-slate-900 hover:underline"
                  >
                    {ticket.subject}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-2 text-slate-900">{ticket.organisation.name}</td>
                <td className="whitespace-nowrap px-2">
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={ticket.assignee?.name} size={24} />
                    <span className={ticket.assignee ? "text-slate-900" : "text-slate-500"}>
                      {ticket.assignee?.name ?? "Unassigned"}
                    </span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-2">
                  <PriorityLabel name={ticket.priority.name} />
                </td>
                <td className="px-2">
                  <StatusLozenge status={ticket.status} />
                </td>
                <td className="whitespace-nowrap px-2 text-slate-600">{formatDate(ticket.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
