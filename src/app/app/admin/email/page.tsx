import { AdminNav } from "@/components/admin/admin-nav";
import { AdminSettingsPanel } from "@/components/admin/admin-settings";

export default function AdminEmailPage() {
  return (
    <div className="space-y-6">
      <AdminNav />
      <AdminSettingsPanel activeTab="email" />
    </div>
  );
}
