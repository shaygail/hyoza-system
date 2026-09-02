import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PortalCreateTicket } from "@/components/portal/create-ticket";

export default async function PortalNewTicketPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [priorities, ticketTypes] = await Promise.all([
    prisma.priority.findMany({ where: { tenantId: session.user.tenantId }, orderBy: { sortOrder: "asc" } }),
    prisma.ticketType.findMany({ where: { tenantId: session.user.tenantId, visibleInPortal: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return <PortalCreateTicket priorities={priorities} ticketTypes={ticketTypes} />;
}
