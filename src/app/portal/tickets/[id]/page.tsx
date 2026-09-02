import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCustomerTicket } from "@/domain/portal";
import { PortalTicketDetail } from "@/components/portal/ticket-detail";

export default async function PortalTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const ticket = await getCustomerTicket(session.user.id, id);
  if (!ticket) notFound();

  const serialized = {
    ...ticket,
    comments: ticket.comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
  };

  return <PortalTicketDetail ticket={serialized as Parameters<typeof PortalTicketDetail>[0]["ticket"]} />;
}
