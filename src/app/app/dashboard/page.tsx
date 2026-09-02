import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/domain/tickets";
import { EditableDashboard } from "@/components/dashboard/editable-dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const stats = await getDashboardStats(session.user.tenantId, session.user.id);

  const serialized = {
    myOpen: stats.myOpen,
    unassigned: stats.unassigned,
    slaAtRisk: stats.slaAtRisk.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      resolutionDueAt: t.resolutionDueAt?.toISOString() ?? null,
    })),
    recent: { length: stats.recent.length },
    myTickets: stats.myTickets.map((t) => ({
      ...t,
      updatedAt: t.updatedAt.toISOString(),
    })),
  };

  return (
    <EditableDashboard
      stats={serialized}
      userName={session.user.name?.split(" ")[0] ?? "there"}
    />
  );
}
