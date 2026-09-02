"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Ticket,
  Users,
  Settings,
  ListOrdered,
  Cloud,
  HardDrive,
  Clock,
  Columns3,
  BookOpen,
  BarChart3,
} from "lucide-react";

const navItems = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/board", label: "Board", icon: Columns3 },
  { href: "/app/queues", label: "Queues", icon: ListOrdered },
  { href: "/app/tickets", label: "Tickets", icon: Ticket },
  { href: "/app/customers", label: "Customers", icon: Users },
  { href: "/app/assets", label: "Assets", icon: HardDrive },
  { href: "/app/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/app/time", label: "Time", icon: Clock },
  { href: "/app/reports", label: "Reports", icon: BarChart3 },
  { href: "/app/admin", label: "Administration", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ourcloud-600 text-white">
          <Cloud className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">HYOZA</div>
          <div className="text-xs text-slate-500">Service Desk</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-ourcloud-50 text-ourcloud-700" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
