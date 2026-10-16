import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getDashboardStats } from "@/domain/tickets";
import { EditableDashboard } from "@/components/dashboard/editable-dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  // Finance-only users (billing access, no ticket editing) land in their own workspace.
  const [isService, canBill] = await Promise.all([
    hasPermission(session.user.id, "tickets.edit"),
    hasPermission(session.user.id, "billing.view"),
  ]);
  if (!isService && canBill) redirect("/app/finance");

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
