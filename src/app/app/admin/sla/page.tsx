import { AdminNav } from "@/components/admin/admin-nav";
import { AdminSettingsPanel } from "@/components/admin/admin-settings";

export default function AdminSlaPage() {
  return (
    <div className="space-y-6">
      <AdminNav />
      <AdminSettingsPanel activeTab="sla" />
    </div>
  );
}
