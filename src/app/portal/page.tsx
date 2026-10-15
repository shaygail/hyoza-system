import Link from "next/link";
import { auth } from "@/lib/auth";
import { listCustomerTickets, getCustomerContact } from "@/domain/portal";
import { getPortalConfigForUser } from "@/domain/portal-public";
import { Badge } from "@/components/ui/badge";
import { BookOpen, MessageSquarePlus, ListChecks } from "lucide-react";

export default async function PortalHomePage() {
  const session = await auth();
  if (!session?.user) return null;

  const contact = await getCustomerContact(session.user.id);
  const portalConfig = await getPortalConfigForUser(session.user.tenantId);
  const primary = portalConfig?.branding.primaryColor ?? "#0c66e4";
  const tickets = await listCustomerTickets(session.user.id);
  const openCount = tickets.filter((t) => t.status.category === "open" || t.status.category === "waiting").length;

  const actions = [
    { href: "/portal/tickets/new", icon: MessageSquarePlus, title: "Raise a request", body: "Report a problem or ask for something new." },
    { href: "/portal/tickets", icon: ListChecks, title: "My requests", body: `${openCount} open · ${tickets.length} total` },
    { href: "/portal/knowledge", icon: BookOpen, title: "Browse articles", body: "Guides and troubleshooting tips." },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-[4px] px-8 py-10 text-white" style={{ backgroundColor: primary }}>
        <h1 className="text-2xl font-semibold">Welcome, {contact?.name ?? session.user.name}</h1>
        <p className="mt-1 text-white/85">{contact?.organisation.name} help center — what can we help you with?</p>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {actions.map(({ href, icon: Icon, title, body }) => (
          <Link key={href} href={href} className="flex gap-3 rounded-[4px] bg-white p-4 shadow-card hover:bg-slate-50">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] text-white"
              style={{ backgroundColor: primary }}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-medium text-slate-900">{title}</span>
              <span className="block text-sm text-slate-600">{body}</span>
            </span>
          </Link>
        ))}
      </div>

      <section className="rounded-[4px] bg-white shadow-card">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Recent requests</h2>
        {tickets.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">You haven&apos;t raised any requests yet.</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {tickets.slice(0, 5).map((t) => (
              <Link key={t.id} href={`/portal/tickets/${t.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <span className="w-24 shrink-0 text-sm text-ourcloud-700">{t.ticketNumber}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-900">{t.subject}</span>
                <Badge color={t.status.color}>{t.status.name}</Badge>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
