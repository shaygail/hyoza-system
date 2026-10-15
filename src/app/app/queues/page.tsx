import Link from "next/link";
import { auth } from "@/lib/auth";
import { listQueues } from "@/domain/queues";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Inbox } from "lucide-react";

export default async function QueuesPage() {
  const session = await auth();
  if (!session?.user) return null;

  const { pinned, all } = await listQueues(session.user.tenantId, session.user.id);

  async function getQueueCount(queueId: string) {
    const queue = await prisma.queue.findUnique({ where: { id: queueId } });
    if (!queue) return 0;
    const { getQueueTickets } = await import("@/domain/queues");
    const tickets = await getQueueTickets(session!.user!.tenantId, queueId, session!.user!.id);
    return tickets.length;
  }

  const pinnedWithCounts = await Promise.all(
    pinned.map(async (q) => ({ ...q, count: await getQueueCount(q.id) }))
  );
  const allWithCounts = await Promise.all(
    all.map(async (q) => ({ ...q, count: await getQueueCount(q.id) }))
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Queues" description="Saved filters your team works from." />

      {pinnedWithCounts.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Starred</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {pinnedWithCounts.map((q) => (
              <QueueCard key={q.id} queue={q} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">All queues</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {allWithCounts.map((q) => (
            <QueueCard key={q.id} queue={q} />
          ))}
        </div>
      </section>
    </div>
  );
}

function QueueCard({ queue }: { queue: { id: string; name: string; description: string | null; count: number } }) {
  return (
    <Link
      href={`/app/queues/${queue.id}`}
      className="block rounded-[4px] bg-white p-4 shadow-card transition-colors hover:bg-slate-50"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-medium text-slate-900">
          <Inbox className="h-4 w-4 text-slate-500" />
          {queue.name}
        </h3>
        <span className="rounded-full bg-slate-200 px-2 text-sm font-semibold text-slate-700">{queue.count}</span>
      </div>
      {queue.description && <p className="mt-1 text-sm text-slate-500">{queue.description}</p>}
    </Link>
  );
}
