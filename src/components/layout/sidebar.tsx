"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Cloud, Bell, LogOut } from "lucide-react";

const navItems = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/board", label: "Board" },
  { href: "/app/queues", label: "Queues" },
  { href: "/app/tickets", label: "Tickets" },
  { href: "/app/customers", label: "CRM", permission: "customers.view" },
  { href: "/app/assets", label: "Assets" },
  { href: "/app/knowledge", label: "Knowledge" },
  { href: "/app/time", label: "Time" },
  { href: "/app/admin/billing", label: "Billing", permission: "billing.view" },
  { href: "/app/reports", label: "Reports" },
  { href: "/app/admin", label: "Administration" },
];

interface Notification {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
  isRead: boolean;
}

export function Sidebar({
  permissions = [],
  userName,
}: {
  permissions?: string[];
  userName?: string | null;
}) {
  const pathname = usePathname();
  const visibleItems = navItems.filter(
    (item) => !("permission" in item) || !item.permission || permissions.includes(item.permission!)
  );
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    fetch("/api/v1/notifications")
      .then((r) => r.json())
      .then(setNotifications)
      .catch(() => {});
  }, []);

  async function markRead(id: string) {
    await fetch("/api/v1/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  return (
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ourcloud-600 text-white">
          <Cloud className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight text-slate-900">HYOZA</div>
          <div className="text-[11px] leading-tight text-slate-500">Service Desk</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {visibleItems.map((item) => {
          const active =
            item.href === "/app/admin"
              ? pathname.startsWith("/app/admin") && !pathname.startsWith("/app/admin/billing")
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-colors",
                active
                  ? "bg-ourcloud-50 font-semibold text-ourcloud-700"
                  : "font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              <span
                className={cn(
                  "inline-block h-2 w-2 shrink-0 rounded-full",
                  active ? "bg-ourcloud-600" : "bg-slate-200"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-slate-200 px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-50"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {unread}
              </span>
            )}
          </button>
          <div className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">
            {userName ?? "Agent"}
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {open && (
          <div className="absolute bottom-14 left-3 right-3 z-50 max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
              Notifications
            </div>
            {notifications.length === 0 ? (
              <p className="p-3 text-xs text-slate-500">No notifications</p>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-slate-50 px-3 py-2.5 text-xs ${n.isRead ? "opacity-60" : ""}`}
                >
                  {n.linkUrl ? (
                    <Link
                      href={n.linkUrl}
                      onClick={() => markRead(n.id)}
                      className="block hover:text-ourcloud-700"
                    >
                      <p className="font-medium text-slate-900">{n.title}</p>
                      <p className="text-slate-500">{n.body}</p>
                    </Link>
                  ) : (
                    <button type="button" onClick={() => markRead(n.id)} className="w-full text-left">
                      <p className="font-medium text-slate-900">{n.title}</p>
                      <p className="text-slate-500">{n.body}</p>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
