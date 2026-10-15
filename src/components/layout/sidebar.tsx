"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChartColumn,
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

type NavItem = { href: string; label: string; icon: typeof Inbox; permission?: string };

const sections: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: "/app/dashboard", label: "Summary", icon: LayoutDashboard },
      { href: "/app/board", label: "Board", icon: SquareKanban },
      { href: "/app/queues", label: "Queues", icon: Inbox },
      { href: "/app/tickets", label: "Tickets", icon: ListTodo },
    ],
  },
  {
    title: "Service",
    items: [
      { href: "/app/customers", label: "Customers", icon: Users, permission: "customers.view" },
      { href: "/app/assets", label: "Assets", icon: Server },
      { href: "/app/knowledge", label: "Knowledge base", icon: BookOpen },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/app/time", label: "Time tracking", icon: Timer },
      { href: "/app/reports", label: "Reports", icon: ChartColumn },
      { href: "/app/admin/billing", label: "Billing", icon: Receipt, permission: "billing.view" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/app/admin") {
    return pathname.startsWith("/app/admin") && !pathname.startsWith("/app/admin/billing");
  }
  return pathname.startsWith(href);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
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

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2.5 px-4 pb-4 pt-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-[#e56910] text-sm font-bold text-white">
          HS
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">HYOZA Service Desk</div>
          <div className="truncate text-xs text-slate-500">Service project</div>
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

      <div className="border-t border-slate-200 p-2">
        <NavLink item={{ href: "/app/admin", label: "Project settings", icon: Settings }} pathname={pathname} />
      </div>
    </aside>
  );
}
