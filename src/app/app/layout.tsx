import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { auth } from "@/lib/auth";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header userName={session?.user?.name} />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
