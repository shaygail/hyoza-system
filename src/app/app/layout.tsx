import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { auth } from "@/lib/auth";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <Header userName={session?.user?.name} permissions={session?.user?.permissions ?? []} />
      <div className="flex min-h-0 flex-1">
        <Sidebar permissions={session?.user?.permissions ?? []} />
        <main className="flex-1 overflow-auto px-10 py-6">{children}</main>
      </div>
    </div>
  );
}
