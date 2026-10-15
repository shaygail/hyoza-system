"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CircleQuestionMark, Cloud, Grip, LogOut, Plus, Search, Settings } from "lucide-react";
import { Avatar } from "@/components/ui/jira";

interface Notification {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
  isRead: boolean;
}

/** Jira-style global navigation bar. */
export function Header({ userName }: { userName?: string | null }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [menu, setMenu] = useState<"notifications" | "profile" | null>(null);
  const [q, setQ] = useState("");
  const barRef = useRef<HTMLElement>(null);
  const unread = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    fetch("/api/v1/notifications")
      .then((r) => r.json())
      .then(setNotifications)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  async function markRead(id: string) {
    await fetch("/api/v1/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/app/tickets?view=all&q=${encodeURIComponent(term)}` : "/app/tickets");
  }

  const iconButton =
    "relative flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-[#091e420f]";

  return (
    <header
      ref={barRef}
      className="relative z-40 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3"
    >
      <button type="button" className={`${iconButton} rounded-[3px]`} aria-label="Apps">
        <Grip className="h-5 w-5" />
      </button>
      <Link href="/app/dashboard" className="flex items-center gap-1.5 rounded-[3px] px-1.5 py-1 hover:bg-[#091e420f]">
        <span className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-ourcloud-600 text-white">
          <Cloud className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <span className="text-[15px] font-semibold text-slate-600">HYOZA</span>
      </Link>

      <nav className="ml-2 hidden items-center gap-0.5 md:flex">
        {[
          { href: "/app/dashboard", label: "Your work" },
          { href: "/app/queues", label: "Queues" },
          { href: "/app/reports", label: "Dashboards" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-[3px] px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-[#091e420f]"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/app/tickets/new"
          className="ml-2 inline-flex h-8 items-center gap-1 rounded-[3px] bg-ourcloud-600 px-3 text-sm font-medium text-white hover:bg-ourcloud-700"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Create
        </Link>
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <form onSubmit={search} className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="h-8 w-56 rounded-[3px] border border-slate-300 bg-white pl-8 pr-2 text-sm placeholder:text-slate-500 hover:bg-slate-50 focus:w-80 focus:border-ourcloud-400 focus:outline-none focus:ring-1 focus:ring-ourcloud-400 transition-[width]"
          />
        </form>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu(menu === "notifications" ? null : "notifications")}
            className={iconButton}
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -right-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c9372c] px-1 text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          {menu === "notifications" && (
            <div className="absolute right-0 mt-1 max-h-[28rem] w-96 overflow-auto rounded-[4px] bg-white shadow-overlay">
              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <span className="text-xl font-semibold text-slate-900">Notifications</span>
                {unread > 0 && <span className="text-xs text-slate-500">{unread} unread</span>}
              </div>
              {notifications.length === 0 ? (
                <p className="px-4 pb-6 pt-2 text-sm text-slate-500">You have no notifications.</p>
              ) : (
                notifications.slice(0, 15).map((n) => {
                  const content = (
                    <div className="flex gap-3">
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-ourcloud-600"}`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{n.title}</p>
                        <p className="text-[13px] text-slate-600">{n.body}</p>
                      </div>
                    </div>
                  );
                  return n.linkUrl ? (
                    <Link
                      key={n.id}
                      href={n.linkUrl}
                      onClick={() => {
                        void markRead(n.id);
                        setMenu(null);
                      }}
                      className="block px-4 py-3 hover:bg-slate-100"
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="block w-full px-4 py-3 text-left hover:bg-slate-100"
                    >
                      {content}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <Link href="/app/knowledge" className={iconButton} aria-label="Help">
          <CircleQuestionMark className="h-5 w-5" />
        </Link>
        <Link href="/app/admin" className={iconButton} aria-label="Settings">
          <Settings className="h-5 w-5" />
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu(menu === "profile" ? null : "profile")}
            className="ml-1 rounded-full p-0.5 hover:ring-2 hover:ring-slate-200"
            aria-label="Your profile"
          >
            <Avatar name={userName ?? "Agent"} size={28} />
          </button>
          {menu === "profile" && (
            <div className="absolute right-0 mt-1 w-60 rounded-[4px] bg-white py-2 shadow-overlay">
              <div className="flex items-center gap-2.5 px-4 py-2">
                <Avatar name={userName ?? "Agent"} size={32} />
                <span className="truncate text-sm font-medium text-slate-900">{userName ?? "Agent"}</span>
              </div>
              <div className="my-1 border-t border-slate-200" />
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-900 hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4 text-slate-600" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
