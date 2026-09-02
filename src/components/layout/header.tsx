"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut, User, Bell } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
  isRead: boolean;
}

export function Header({ userName }: { userName?: string | null }) {
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
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {unread}
              </span>
            )}
          </button>
          {open && (
            <div className="absolute right-0 z-50 mt-1 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-4 py-2 text-sm font-medium">Notifications</div>
              {notifications.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">No notifications</p>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    className={`border-b border-slate-50 px-4 py-3 text-sm ${n.isRead ? "opacity-60" : ""}`}
                  >
                    {n.linkUrl ? (
                      <Link href={n.linkUrl} onClick={() => markRead(n.id)} className="block hover:text-ourcloud-600">
                        <p className="font-medium">{n.title}</p>
                        <p className="text-slate-500">{n.body}</p>
                      </Link>
                    ) : (
                      <div onClick={() => markRead(n.id)}>
                        <p className="font-medium">{n.title}</p>
                        <p className="text-slate-500">{n.body}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <User className="h-4 w-4" />
          {userName}
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
