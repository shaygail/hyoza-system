import { AdminNav } from "@/components/admin/admin-nav";
import { AdminSettingsPanel } from "@/components/admin/admin-settings";

export default function AdminAgreementsPage() {
  return (
    <div className="space-y-6">
      <AdminNav />
      <AdminSettingsPanel activeTab="agreements" />
    </div>
  );
}
