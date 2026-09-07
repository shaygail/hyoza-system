import { AdminNav } from "@/components/admin/admin-nav";
import { SecurityPanel } from "@/components/admin/security-panel";

export default function AdminSecurityPage() {
  return (
    <div className="space-y-6">
      <AdminNav />
      <SecurityPanel />
    </div>
  );
}
