import Link from "next/link";
import { auth } from "@/lib/auth";
import { listQueues } from "@/domain/queues";
import { prisma } from "@/lib/prisma";

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
      <h1 className="text-2xl font-semibold text-slate-900">Queues</h1>

      {pinnedWithCounts.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-slate-500">Pinned</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {pinnedWithCounts.map((q) => (
              <QueueCard key={q.id} queue={q} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-slate-500">All Queues</h2>
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
      className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-ourcloud-200 transition-colors"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-900">{queue.name}</h3>
        <span className="rounded-full bg-ourcloud-100 px-2.5 py-0.5 text-sm font-medium text-ourcloud-700">
          {queue.count}
        </span>
      </div>
      {queue.description && <p className="mt-1 text-sm text-slate-500">{queue.description}</p>}
    </Link>
  );
}
