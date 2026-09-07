import { AdminNav } from "@/components/admin/admin-nav";
import { ContractsPanel } from "@/components/admin/contracts-panel";

export default function AdminContractsPage() {
  return (
    <div className="space-y-6">
      <AdminNav />
      <ContractsPanel />
    </div>
  );
}
