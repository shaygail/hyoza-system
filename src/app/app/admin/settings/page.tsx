import { AdminNav } from "@/components/admin/admin-nav";
import { SystemSettingsPanel } from "@/components/admin/system-settings";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <AdminNav />
      <SystemSettingsPanel />
    </div>
  );
}
