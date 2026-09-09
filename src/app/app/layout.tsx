import { Sidebar } from "@/components/layout/sidebar";
import { auth } from "@/lib/auth";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f5f9]">
      <Sidebar
        permissions={session?.user?.permissions ?? []}
        userName={session?.user?.name}
      />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
