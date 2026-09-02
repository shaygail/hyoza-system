import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCustomerContact } from "@/domain/portal";
import { Button } from "@/components/ui/button";
import { Cloud } from "lucide-react";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const contact = session?.user ? await getCustomerContact(session.user.id) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ourcloud-600 text-white">
              <Cloud className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">{contact?.organisation.name ?? "OurCloud"} Support</div>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/portal" className="text-slate-600 hover:text-ourcloud-600">Home</Link>
            <Link href="/portal/tickets" className="text-slate-600 hover:text-ourcloud-600">My Tickets</Link>
            <Link href="/portal/tickets/new" className="text-slate-600 hover:text-ourcloud-600">Create Ticket</Link>
            <span className="text-slate-400">{session?.user?.name}</span>
            <form action={async () => { "use server"; const { signOut } = await import("@/lib/auth"); await signOut({ redirectTo: "/login" }); }}>
              <Button type="submit" variant="ghost" size="sm">Sign out</Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  );
}
