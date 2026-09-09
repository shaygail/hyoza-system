"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Input, Select, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SoftBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { X } from "lucide-react";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  organisation: { name: string };
  status: { name: string; color: string; code?: string; category?: string };
  priority: { name: string; color: string };
  assignee: { name: string } | null;
  ticketType?: { name: string } | null;
  category?: { name: string } | null;
  resolutionDueAt?: string | null;
  updatedAt: string;
}

interface Metadata {
  priorities: { id: string; name: string }[];
  users: { id: string; name: string }[];
  organisations: { id: string; name: string }[];
}

export type QueueKpis = {
  open: number;
  inProgress: number;
  waiting: number;
  slaBreaching: number;
  totalOpen: number;
};

const queueTabs = [
  { key: "my", label: "My open" },
  { key: "unassigned", label: "Unassigned" },
  { key: "all", label: "All" },
  { key: "resolved", label: "Resolved" },
];

function slaLabel(dueAt: string | null | undefined, statusCategory?: string) {
  if (!dueAt || statusCategory === "resolved" || statusCategory === "closed") return "—";
  const ms = new Date(dueAt).getTime() - Date.now();
  if (ms < 0) return { text: "Breached", breached: true as const };
  const hours = Math.round(ms / 3_600_000);
  if (hours < 24) return { text: `${Math.max(1, hours)}h left`, breached: false as const };
  return { text: `${Math.round(hours / 24)}d left`, breached: false as const };
}

export function TicketSearch({
  initialView = "all",
  kpis,
}: {
  initialView?: string;
  kpis: QueueKpis;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? initialView;
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    priorityId: searchParams.get("priorityId") ?? "",
    assigneeId: searchParams.get("assigneeId") ?? "",
    organisationId: searchParams.get("organisationId") ?? "",
  });
  const [loading, setLoading] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      if (q || filters.priorityId || filters.assigneeId || filters.organisationId) {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (filters.priorityId) params.set("priorityId", filters.priorityId);
        if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
        if (filters.organisationId) params.set("organisationId", filters.organisationId);
        const res = await fetch(`/api/v1/search/tickets?${params}`);
        setTickets(await res.json());
      } else {
        const res = await fetch(`/api/v1/tickets?view=${view}`);
        setTickets(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [q, filters, view]);

  useEffect(() => {
    fetch("/api/v1/metadata")
      .then((r) => r.json())
      .then(setMetadata)
      .catch(() => {});
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  function setView(next: string) {
    router.push(`/app/tickets?view=${next}`);
  }

  const kpisCards = [
    { label: "Open", value: kpis.open, color: "#0891b2" },
    { label: "In progress", value: kpis.inProgress, color: "#8b5cf6" },
    { label: "Waiting", value: kpis.waiting, color: "#f59e0b" },
    { label: "Breaching SLA", value: kpis.slaBreaching, color: "#ef4444" },
  ];

  return (
    <div className="-m-6 flex min-h-full flex-col bg-[#f1f5f9]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900">Tickets</h1>
          <p className="mt-1 text-xs text-slate-500">
            Service desk queue · {kpis.totalOpen} open
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowFilters((v) => !v)}>
            Filters
          </Button>
          <Link href="/app/tickets/new">
            <Button size="sm">New ticket</Button>
          </Link>
        </div>
      </div>

      <div className="space-y-4 p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpisCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-3.5"
          >
            <p className="text-[11px] font-medium text-slate-500">{card.label}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-2xl font-semibold text-slate-900">{card.value}</span>
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: card.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void loadTickets()}
            placeholder="Search tickets, customers, #TCK…"
            className="max-w-md rounded-[10px]"
          />
          <Button variant="secondary" size="sm" onClick={() => void loadTickets()} disabled={loading}>
            Search
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {queueTabs.map((tab) => {
            const active = view === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setView(tab.key)}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? "bg-ourcloud-50 font-semibold text-ourcloud-700"
                    : "font-medium text-slate-500 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {showFilters && metadata && (
        <div className="relative rounded-xl border border-slate-200 bg-white p-4">
          <button
            type="button"
            className="absolute right-3 top-3 rounded p-1 text-slate-400 hover:bg-slate-100"
            onClick={() => setShowFilters(false)}
            aria-label="Close filters"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Priority</Label>
              <Select
                value={filters.priorityId}
                onChange={(e) => setFilters({ ...filters, priorityId: e.target.value })}
              >
                <option value="">All</option>
                {metadata.priorities.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Assignee</Label>
              <Select
                value={filters.assigneeId}
                onChange={(e) => setFilters({ ...filters, assigneeId: e.target.value })}
              >
                <option value="">All</option>
                <option value="unassigned">Unassigned</option>
                {metadata.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Customer</Label>
              <Select
                value={filters.organisationId}
                onChange={(e) => setFilters({ ...filters, organisationId: e.target.value })}
              >
                <option value="">All</option>
                {metadata.organisations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="mt-3">
            <Button size="sm" onClick={() => void loadTickets()} disabled={loading}>
              Apply filters
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500">#</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500">Subject</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500">Customer</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500">Priority</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500">Assignee</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500">SLA</th>
            </tr>
          </thead>
          <tbody>
            {loading && tickets.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && tickets.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No tickets found
                </td>
              </tr>
            )}
            {tickets.map((ticket) => {
              const sla = slaLabel(ticket.resolutionDueAt, ticket.status.category);
              const typeLine = [ticket.ticketType?.name, ticket.category?.name]
                .filter(Boolean)
                .join(" · ");
              return (
                <tr key={ticket.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/app/tickets/${ticket.id}`}
                      className="font-mono text-xs font-medium text-ourcloud-700 hover:underline"
                    >
                      {ticket.ticketNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link href={`/app/tickets/${ticket.id}`} className="block">
                      <p className="font-semibold text-slate-900">{ticket.subject}</p>
                      {typeLine && (
                        <p className="mt-0.5 text-[11px] text-slate-500">{typeLine}</p>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">{ticket.organisation.name}</td>
                  <td className="px-4 py-3.5">
                    <SoftBadge color={ticket.status.color}>{ticket.status.name}</SoftBadge>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800">
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: ticket.priority.color }}
                      />
                      {ticket.priority.name}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3.5 text-xs ${
                      ticket.assignee ? "text-slate-700" : "text-slate-400"
                    }`}
                  >
                    {ticket.assignee?.name ?? "Unassigned"}
                  </td>
                  <td
                    className={`px-4 py-3.5 text-xs font-medium ${
                      typeof sla === "object" && sla.breached ? "text-red-500" : "text-slate-500"
                    }`}
                  >
                    {typeof sla === "string" ? sla : sla.text}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && tickets.length > 0 && (
          <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
            Updated {formatDate(tickets[0]?.updatedAt)} · {tickets.length} shown
          </p>
        )}
      </div>
      </div>
    </div>
  );
}
