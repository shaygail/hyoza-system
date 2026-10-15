"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SoftBadge } from "@/components/ui/badge";
import { PriorityIcon } from "@/components/ui/jira";
import { formatDate } from "@/lib/utils";
import { Settings2, Plus } from "lucide-react";
import type { DashboardWidgetId } from "@/domain/dashboard";

const WIDGET_META: Record<DashboardWidgetId, { label: string; description: string }> = {
  myOpen: { label: "My Open Tickets", description: "Count of tickets assigned to you" },
  unassigned: { label: "Unassigned", description: "Tickets waiting for assignment" },
  slaAtRisk: { label: "SLA At Risk", description: "Tickets approaching SLA breach" },
  recent: { label: "Recently Updated", description: "Count of recently updated tickets" },
  myTickets: { label: "My Tickets List", description: "List of your open tickets" },
};

interface Stats {
  myOpen: number;
  unassigned: number;
  slaAtRisk: { id: string; ticketNumber: string; subject: string; resolutionDueAt: string | null }[];
  recent: { length: number };
  myTickets: {
    id: string;
    ticketNumber: string;
    subject: string;
    updatedAt: string;
    organisation: { name: string };
    status: { name: string; color: string };
    priority: { name: string; color: string };
  }[];
}

export function EditableDashboard({ stats, userName }: { stats: Stats; userName: string }) {
  const [layout, setLayout] = useState<DashboardWidgetId[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/v1/dashboard/layout")
      .then((r) => r.json())
      .then((d) => setLayout(d.layout));
  }, []);

  async function saveLayout() {
    setSaving(true);
    await fetch("/api/v1/dashboard/layout", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout }),
    });
    setSaving(false);
    setEditMode(false);
  }

  function toggleWidget(id: DashboardWidgetId) {
    setLayout((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    );
  }

  const show = (id: DashboardWidgetId) => layout.includes(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Good morning, {userName}</h1>
          <p className="text-sm text-slate-500">Your personalised dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => (editMode ? saveLayout() : setEditMode(true))} disabled={saving}>
            <Settings2 className="mr-2 h-4 w-4" />
            {editMode ? (saving ? "Saving..." : "Save Layout") : "Edit Dashboard"}
          </Button>
          <Link href="/app/tickets/new">
            <Button><Plus className="mr-2 h-4 w-4" />New Ticket</Button>
          </Link>
        </div>
      </div>

      {editMode && (
        <div className="rounded-[4px] border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-900">Choose gadgets to display</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(WIDGET_META) as DashboardWidgetId[]).map((id) => (
              <button
                key={id}
                onClick={() => toggleWidget(id)}
                className={`h-8 rounded-[3px] px-3 text-sm font-medium transition-colors ${
                  show(id)
                    ? "bg-ourcloud-50 text-ourcloud-700 ring-1 ring-ourcloud-400"
                    : "bg-[#091e420f] text-slate-600 hover:bg-[#091e4224]"
                }`}
              >
                {WIDGET_META[id].label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {show("myOpen") && (
          <StatCard label="My Open Tickets" value={stats.myOpen} href="/app/tickets?view=my" />
        )}
        {show("unassigned") && (
          <StatCard label="Unassigned" value={stats.unassigned} href="/app/tickets?view=unassigned" />
        )}
        {show("slaAtRisk") && (
          <StatCard label="SLA At Risk" value={stats.slaAtRisk.length} href="/app/queues" alert={stats.slaAtRisk.length > 0} />
        )}
        {show("recent") && (
          <StatCard label="Recently Updated" value={stats.recent.length} href="/app/tickets" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {show("slaAtRisk") && stats.slaAtRisk.length > 0 && (
          <Gadget title="SLA at risk" count={stats.slaAtRisk.length}>
            {stats.slaAtRisk.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/app/tickets/${ticket.id}`}
                className="flex items-center gap-3 px-4 py-2 hover:bg-slate-100"
              >
                <span className="w-24 shrink-0 text-sm text-ourcloud-700">{ticket.ticketNumber}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-900">{ticket.subject}</span>
                {ticket.resolutionDueAt && (
                  <span className="shrink-0 text-xs text-slate-500">{formatDate(ticket.resolutionDueAt)}</span>
                )}
              </Link>
            ))}
          </Gadget>
        )}

        {show("myTickets") && (
          <Gadget title="Assigned to me" count={stats.myTickets.length}>
            {stats.myTickets.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">No open tickets assigned to you.</p>
            ) : (
              stats.myTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/app/tickets/${ticket.id}`}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-slate-100"
                >
                  <PriorityIcon name={ticket.priority.name} />
                  <span className="w-24 shrink-0 text-sm text-ourcloud-700">{ticket.ticketNumber}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-900">{ticket.subject}</p>
                    <p className="truncate text-xs text-slate-500">{ticket.organisation.name}</p>
                  </div>
                  <SoftBadge color={ticket.status.color}>{ticket.status.name}</SoftBadge>
                </Link>
              ))
            )}
          </Gadget>
        )}
      </div>
    </div>
  );
}

/** Jira dashboard gadget: bordered panel with a title bar. */
function Gadget({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="rounded-[4px] border border-slate-200">
      <h2 className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
        {title}
        <span className="rounded-full bg-slate-200 px-1.5 text-xs font-semibold text-slate-700">{count}</span>
      </h2>
      <div className="max-h-[420px] overflow-y-auto py-1">{children}</div>
    </section>
  );
}

function StatCard({ label, value, href, alert }: { label: string; value: number; href: string; alert?: boolean }) {
  return (
    <Link
      href={href}
      className="rounded-[4px] border border-slate-200 p-4 transition-colors hover:bg-slate-50"
    >
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className={`mt-1 text-[28px] font-medium leading-9 ${alert ? "text-[#c9372c]" : "text-slate-900"}`}>{value}</p>
    </Link>
  );
}
