import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TicketSearch } from "@/components/tickets/ticket-search";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params.view ?? "my";
  const session = await auth();
  const tenantId = session?.user?.tenantId;

  let kpis = { open: 0, inProgress: 0, waiting: 0, slaBreaching: 0, totalOpen: 0 };
  if (tenantId) {
    const now = new Date();
    const [open, inProgress, waiting, slaBreaching, totalOpen] = await Promise.all([
      prisma.ticket.count({
        where: { tenantId, deletedAt: null, status: { code: "open" } },
      }),
      prisma.ticket.count({
        where: { tenantId, deletedAt: null, status: { code: "in_progress" } },
      }),
      prisma.ticket.count({
        where: { tenantId, deletedAt: null, status: { category: "waiting" } },
      }),
      prisma.ticket.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { category: { in: ["open", "waiting"] } },
          resolutionDueAt: { lt: now },
        },
      }),
      prisma.ticket.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { category: { in: ["open", "waiting"] } },
        },
      }),
    ]);
    kpis = { open, inProgress, waiting, slaBreaching, totalOpen };
  }

  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading tickets…</p>}>
      <TicketSearch initialView={view} kpis={kpis} />
    </Suspense>
  );
}
