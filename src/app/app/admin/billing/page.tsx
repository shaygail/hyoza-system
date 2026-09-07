import { AdminNav } from "@/components/admin/admin-nav";
import { BillingPanel } from "@/components/admin/billing-panel";

export default function AdminBillingPage() {
  return (
    <div className="space-y-6">
      <AdminNav />
      <BillingPanel />
    </div>
  );
}
