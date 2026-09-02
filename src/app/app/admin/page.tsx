import Link from "next/link";
import { UserAdminPanel } from "@/components/admin/user-admin";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <nav className="flex gap-4 border-b border-slate-200 pb-2 text-sm">
        <Link href="/app/admin" className="font-medium text-ourcloud-600 border-b-2 border-ourcloud-600 pb-2">
          Users & Roles
        </Link>
        <Link href="/app/admin" className="text-slate-500 hover:text-slate-700 pb-2">
          Settings
        </Link>
      </nav>
      <UserAdminPanel />
    </div>
  );
}
