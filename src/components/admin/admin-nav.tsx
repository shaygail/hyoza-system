"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/app/admin", label: "Users & Roles", exact: true },
  { href: "/app/admin/settings", label: "System" },
  { href: "/app/admin/workflows", label: "Workflows" },
  { href: "/app/admin/automation", label: "Automation" },
  { href: "/app/admin/sla", label: "SLA" },
  { href: "/app/admin/custom-fields", label: "Custom Fields" },
  { href: "/app/admin/roles", label: "CRM Access" },
  { href: "/app/admin/security", label: "Security" },
  { href: "/app/admin/contracts", label: "Contracts" },
  { href: "/app/admin/billing", label: "Billing" },
  { href: "/app/admin/xero", label: "Xero" },
  { href: "/app/admin/email", label: "Email" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 text-sm">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-colors",
              active
                ? "font-medium text-ourcloud-600 bg-ourcloud-50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
