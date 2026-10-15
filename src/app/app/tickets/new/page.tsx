import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listRoutingCategories } from "@/domain/routing";
import { PageHeader } from "@/components/ui/page-header";
import { CreateTicketForm } from "@/components/tickets/create-ticket-form";

export default async function NewTicketPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [priorities, ticketTypes, technicians, routingCategories, organisations] = await Promise.all([
    prisma.priority.findMany({ where: { tenantId: session.user.tenantId }, orderBy: { sortOrder: "asc" } }),
    prisma.ticketType.findMany({ where: { tenantId: session.user.tenantId }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({
      where: {
        tenantId: session.user.tenantId,
        isActive: true,
        NOT: { userRoles: { some: { role: { code: "customer" } } } },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    listRoutingCategories(session.user.tenantId),
    prisma.organisation.findMany({
      where: { tenantId: session.user.tenantId },
      include: { contacts: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="Create ticket" breadcrumbs={[{ label: "Tickets", href: "/app/tickets" }]} />
      <CreateTicketForm
        metadata={{ priorities, ticketTypes, technicians, routingCategories, organisations }}
      />
    </div>
  );
}
