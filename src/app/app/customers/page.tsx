import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { listOrganisations } from "@/domain/organisations";
import { getUserSecurityLevel } from "@/domain/security";
import { CustomersListClient } from "@/components/customers/customers-list";

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user) return null;
  if (!(await hasPermission(session.user.id, "customers.view"))) {
    redirect("/app/dashboard");
  }

  const level = await getUserSecurityLevel(session.user.id);
  const organisations = await listOrganisations(session.user.tenantId, { minSecurityLevel: level });
  const canEdit = await hasPermission(session.user.id, "customers.edit");

  return <CustomersListClient organisations={organisations} canEdit={canEdit} />;
}
