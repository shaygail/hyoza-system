import { AdminNav } from "@/components/admin/admin-nav";
import { AdminSettingsPanel } from "@/components/admin/admin-settings";

export default function AdminWorkflowsPage() {
  return (
    <div className="space-y-6">
      <AdminNav />
      <AdminSettingsPanel activeTab="workflows" />
    </div>
  );
}
