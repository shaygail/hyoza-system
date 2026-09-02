"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        <div className="rounded-xl border border-ourcloud-200 bg-ourcloud-50 p-4">
          <p className="mb-3 text-sm font-medium text-ourcloud-800">Choose widgets to display</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(WIDGET_META) as DashboardWidgetId[]).map((id) => (
              <button
                key={id}
                onClick={() => toggleWidget(id)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  show(id)
                    ? "border-ourcloud-500 bg-ourcloud-100 text-ourcloud-800"
                    : "border-slate-200 bg-white text-slate-600"
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

      {show("slaAtRisk") && stats.slaAtRisk.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50">
          <div className="border-b border-red-200 px-4 py-3 font-medium text-red-800">SLA At Risk</div>
          <div className="divide-y divide-red-100">
            {stats.slaAtRisk.map((ticket) => (
              <Link key={ticket.id} href={`/app/tickets/${ticket.id}`} className="block px-4 py-3 hover:bg-red-100/50">
                <span className="font-mono text-xs text-red-600">{ticket.ticketNumber}</span>
                <p className="text-sm font-medium text-red-900">{ticket.subject}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {show("myTickets") && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 font-medium">My Open Tickets</div>
          <div className="divide-y divide-slate-100">
            {stats.myTickets.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">No open tickets assigned to you.</p>
            ) : (
              stats.myTickets.map((ticket) => (
                <Link key={ticket.id} href={`/app/tickets/${ticket.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">{ticket.ticketNumber}</span>
                      <Badge color={ticket.status.color}>{ticket.status.name}</Badge>
                      <Badge color={ticket.priority.color}>{ticket.priority.name}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium">{ticket.subject}</p>
                    <p className="text-xs text-slate-500">{ticket.organisation.name}</p>
                  </div>
                  <span className="text-xs text-slate-400">{formatDate(ticket.updatedAt)}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, href, alert }: { label: string; value: number; href: string; alert?: boolean }) {
  return (
    <Link href={href} className={`rounded-xl border bg-white p-6 transition-colors ${alert ? "border-red-200" : "border-slate-200 hover:border-ourcloud-200"}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${alert ? "text-red-600" : "text-ourcloud-700"}`}>{value}</p>
    </Link>
  );
}
