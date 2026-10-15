import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCustomerContact } from "@/domain/portal";
import { getPortalConfigForUser } from "@/domain/portal-public";
import { Avatar } from "@/components/ui/jira";
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
  const primary = portalConfig?.branding.primaryColor ?? "#0c66e4";
  const logoUrl = portalConfig?.branding.logoUrl;

  const navLink = "rounded-[3px] px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-[#091e420f]";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50" style={{ "--portal-primary": primary } as React.CSSProperties}>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/portal" className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={orgName} className="h-8 w-auto" />
            ) : (
              <span
                className="flex h-7 w-7 items-center justify-center rounded-[4px] text-white"
                style={{ backgroundColor: primary }}
              >
                <Cloud className="h-4 w-4" strokeWidth={2.5} />
              </span>
            )}
            <span className="text-sm font-semibold text-slate-900">
              {orgName} {portalTitle}
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            <Link href="/portal" className={navLink}>Help center</Link>
            <Link href="/portal/tickets" className={navLink}>Requests</Link>
            <Link href="/portal/knowledge" className={navLink}>Articles</Link>
            <Link
              href="/portal/tickets/new"
              className="ml-1 inline-flex h-8 items-center rounded-[3px] px-3 text-sm font-medium text-white hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              Raise a request
            </Link>
            <span className="ml-2 hidden items-center gap-2 text-sm text-slate-600 sm:flex">
              <Avatar name={session.user.name} size={28} />
            </span>
            <form action={async () => { "use server"; const { signOut } = await import("@/lib/auth"); await signOut({ redirectTo: "/support" }); }}>
              <button type="submit" className={navLink}>Log out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        Powered by <span className="font-semibold text-slate-600">HYOZA System</span>
      </footer>
    </div>
  );
}
