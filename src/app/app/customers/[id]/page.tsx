import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { getOrganisation } from "@/domain/organisations";
import { getOrganisationTimeUsage } from "@/domain/contracts";
import { AccountDetailClient } from "@/components/customers/account-detail";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;
  if (!(await hasPermission(session.user.id, "customers.view"))) {
    redirect("/app/dashboard");
  }

  const { id } = await params;
  const organisation = await getOrganisation(session.user.tenantId, id);
  if (!organisation) notFound();

  const tickets = await prisma.ticket.findMany({
    where: { organisationId: id, tenantId: session.user.tenantId, deletedAt: null },
    include: { status: true, priority: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const usage = await getOrganisationTimeUsage(session.user.tenantId, id);
  const canEdit = await hasPermission(session.user.id, "customers.edit");

  return (
    <AccountDetailClient
      account={{
        ...organisation,
        contacts: organisation.contacts,
      }}
      tickets={tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        updatedAt: t.updatedAt.toISOString(),
        status: t.status,
        priority: t.priority,
      }))}
      canEdit={canEdit}
      usage={{
        usedMinutes: usage.usedMinutes,
        allowanceMinutes: usage.allowanceMinutes,
        remainingMinutes: usage.remainingMinutes,
      }}
    />
  );
}
