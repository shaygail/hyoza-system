import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const organisation = await prisma.organisation.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      contacts: true,
      tickets: {
        where: { deletedAt: null },
        include: { status: true, priority: true, assignee: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!organisation) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/customers" className="text-sm text-ourcloud-600 hover:underline">← Customers</Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{organisation.name}</h1>
        <p className="text-sm text-slate-500">
          {organisation.accountCode && `Account: ${organisation.accountCode} · `}
          {organisation.email} {organisation.phone && `· ${organisation.phone}`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-medium text-slate-900">Contacts</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {organisation.contacts.map((contact) => (
              <div key={contact.id} className="px-4 py-3">
                <p className="font-medium text-slate-900">{contact.name}</p>
                <p className="text-sm text-slate-500">{contact.email}</p>
                {contact.jobTitle && <p className="text-xs text-slate-400">{contact.jobTitle}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-medium text-slate-900">Tickets</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {organisation.tickets.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">No tickets for this customer.</p>
            ) : (
              organisation.tickets.map((ticket) => (
                <Link key={ticket.id} href={`/app/tickets/${ticket.id}`} className="block px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{ticket.ticketNumber}</span>
                    <Badge color={ticket.status.color}>{ticket.status.name}</Badge>
                    <Badge color={ticket.priority.color}>{ticket.priority.name}</Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-900">{ticket.subject}</p>
                  <p className="text-xs text-slate-400">{formatDate(ticket.updatedAt)}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
