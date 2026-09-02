import { AdminNav } from "@/components/admin/admin-nav";
import { UserAdminPanel } from "@/components/admin/user-admin";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <AdminNav />
      <UserAdminPanel />
    </div>
  );
}
