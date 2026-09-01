import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateTicketForm } from "@/components/tickets/create-ticket-form";

export default async function NewTicketPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [priorities, ticketTypes, users, teams, organisations] = await Promise.all([
    prisma.priority.findMany({ where: { tenantId: session.user.tenantId }, orderBy: { sortOrder: "asc" } }),
    prisma.ticketType.findMany({ where: { tenantId: session.user.tenantId }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ where: { tenantId: session.user.tenantId, isActive: true }, select: { id: true, name: true } }),
    prisma.team.findMany({ where: { tenantId: session.user.tenantId } }),
    prisma.organisation.findMany({
      where: { tenantId: session.user.tenantId },
      include: { contacts: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Create Ticket</h1>
      <CreateTicketForm metadata={{ priorities, ticketTypes, users, teams, organisations }} />
    </div>
  );
}
