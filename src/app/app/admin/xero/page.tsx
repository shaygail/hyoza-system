import { AdminNav } from "@/components/admin/admin-nav";
import { XeroPanel } from "@/components/admin/xero-panel";

export default function AdminXeroPage() {
  return (
    <div className="space-y-6">
      <AdminNav />
      <XeroPanel />
    </div>
  );
}
