"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChartColumn,
  ChartPie,
  Handshake,
  FileText,
  Inbox,
  LayoutDashboard,
  ListTodo,
  Receipt,
  Server,
  Settings,
  SquareKanban,
  Timer,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof Inbox; permission?: string; exact?: boolean };

/** Items that need ticket-editing rights are the service desk; finance-only users don't see them. */
const SERVICE = "tickets.edit";

const sections: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: "/app/dashboard", label: "Summary", icon: LayoutDashboard, permission: SERVICE },
      { href: "/app/board", label: "Board", icon: SquareKanban, permission: SERVICE },
      { href: "/app/queues", label: "Queues", icon: Inbox, permission: SERVICE },
      { href: "/app/tickets", label: "Tickets", icon: ListTodo, permission: SERVICE },
    ],
  },
  {
    title: "Service",
    items: [
      { href: "/app/customers", label: "Customers", icon: Users, permission: "customers.view" },
      { href: "/app/assets", label: "Assets", icon: Server, permission: SERVICE },
      { href: "/app/knowledge", label: "Knowledge base", icon: BookOpen, permission: SERVICE },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/app/time", label: "Time tracking", icon: Timer, permission: SERVICE },
      { href: "/app/reports", label: "Reports", icon: ChartColumn, permission: SERVICE },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/app/finance", label: "Billing review", icon: Receipt, permission: "billing.view", exact: true },
      { href: "/app/finance/invoices", label: "Invoices", icon: FileText, permission: "billing.view" },
      { href: "/app/finance/contracts", label: "Contracts", icon: Handshake, permission: "contracts.view" },
      { href: "/app/finance/reports", label: "Finance reports", icon: ChartPie, permission: "billing.view" },
    ],
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname.startsWith(href);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href, item.exact);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex h-9 items-center gap-3 rounded-[3px] px-3 text-sm transition-colors",
        active ? "bg-ourcloud-50 font-medium text-ourcloud-700" : "text-slate-600 hover:bg-[#091e420f]"
      )}
    >
      {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-[2px] bg-ourcloud-600" />}
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

/** Jira-style project sidebar. Notifications and sign-out live in the top bar. */
export function Sidebar({ permissions = [] }: { permissions?: string[] }) {
  const pathname = usePathname();
  const allowed = (item: NavItem) => !item.permission || permissions.includes(item.permission);
  const financeOnly = !permissions.includes(SERVICE) && permissions.includes("billing.view");
  const canAdmin = permissions.some((p) => p.startsWith("admin."));

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2.5 px-4 pb-4 pt-5">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-[4px] text-sm font-bold text-white ${
            financeOnly ? "bg-[#1f845a]" : "bg-[#e56910]"
          }`}
        >
          {financeOnly ? "FI" : "HS"}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            {financeOnly ? "HYOZA Finance" : "HYOZA Service Desk"}
          </div>
          <div className="truncate text-xs text-slate-500">{financeOnly ? "Billing workspace" : "Service project"}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-3">
        {sections.map((section, i) => {
          const items = section.items.filter(allowed);
          if (items.length === 0) return null;
          return (
            <div key={section.title ?? i} className="space-y-0.5">
              {section.title && (
                <div className="px-3 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {section.title}
                </div>
              )}
              {items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </div>
          );
        })}
      </nav>

      {canAdmin && (
        <div className="border-t border-slate-200 p-2">
          <NavLink item={{ href: "/app/admin", label: "Project settings", icon: Settings }} pathname={pathname} />
        </div>
      )}
    </aside>
  );
}
