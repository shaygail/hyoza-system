"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

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

/** Project settings header with Jira-style underlined tabs. */
export function AdminNav() {
  const pathname = usePathname();
  const current = tabs.find((t) => (t.exact ? pathname === t.href : pathname.startsWith(t.href)));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Project settings"
        breadcrumbs={current ? [{ label: "Project settings", href: "/app/admin" }, { label: current.label }] : []}
      />
      <nav className="flex gap-1 overflow-x-auto border-b-2 border-slate-200 text-sm">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "-mb-0.5 whitespace-nowrap border-b-2 px-2 pb-2 pt-1 font-medium transition-colors",
                active
                  ? "border-ourcloud-600 text-ourcloud-700"
                  : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
