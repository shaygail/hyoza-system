import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCustomerContact } from "@/domain/portal";
import { getPortalConfigForUser } from "@/domain/portal-public";
import { Button } from "@/components/ui/button";
import { Cloud } from "lucide-react";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    return <>{children}</>;
  }

  const contact = await getCustomerContact(session.user.id);
  const portalConfig = await getPortalConfigForUser(session.user.tenantId);

  const orgName = contact?.organisation.name ?? portalConfig?.tenantName ?? "HYOZA";
  const portalTitle = portalConfig?.portalTitle ?? "Support";
  const primary = portalConfig?.branding.primaryColor ?? "#0891b2";
  const logoUrl = portalConfig?.branding.logoUrl;

  return (
    <div className="min-h-screen bg-slate-50" style={{ "--portal-primary": primary } as React.CSSProperties}>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/portal" className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={orgName} className="h-8 w-auto" />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: primary }}
              >
                <Cloud className="h-4 w-4" />
              </div>
            )}
            <div>
              <div className="text-sm font-semibold">{orgName} {portalTitle}</div>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <Link href="/portal" className="text-slate-600 hover:opacity-80">Home</Link>
            <Link href="/portal/tickets" className="text-slate-600 hover:opacity-80">My Tickets</Link>
            <Link href="/portal/tickets/new" className="text-slate-600 hover:opacity-80">Create Ticket</Link>
            <Link href="/portal/knowledge" className="text-slate-600 hover:opacity-80">Help</Link>
            <span className="text-slate-400">{session?.user?.name}</span>
            <form action={async () => { "use server"; const { signOut } = await import("@/lib/auth"); await signOut({ redirectTo: "/support" }); }}>
              <Button type="submit" variant="ghost" size="sm">Sign out</Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Powered by <span className="font-medium text-slate-500">HYOZA System</span>
      </footer>
    </div>
  );
}
