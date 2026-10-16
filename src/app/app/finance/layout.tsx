import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await hasPermission(session.user.id, "billing.view"))) redirect("/app/dashboard");
  return <>{children}</>;
}
