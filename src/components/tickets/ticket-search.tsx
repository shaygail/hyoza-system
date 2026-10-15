"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Input, Select, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, PriorityLabel, StatusLozenge, TypeIcon } from "@/components/ui/jira";
import { formatDate } from "@/lib/utils";
import { ListFilter, Search, X } from "lucide-react";

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

  const stats = [
    { label: "Open", value: kpis.open },
    { label: "In progress", value: kpis.inProgress },
    { label: "Waiting", value: kpis.waiting },
    { label: "Breaching SLA", value: kpis.slaBreaching, danger: kpis.slaBreaching > 0 },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <nav className="text-sm text-slate-500">
        <Link href="/app/dashboard" className="hover:underline">
          Projects
        </Link>
        <span className="mx-2">/</span>
        <Link href="/app/dashboard" className="hover:underline">
          HYOZA Service Desk
        </Link>
      </nav>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Tickets</h1>
        <div className="flex items-center gap-2">
          <Link href="/app/tickets/new">
            <Button>Create ticket</Button>
          </Link>
        </div>
      </div>

      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
        <span>{kpis.totalOpen} open in project</span>
        {stats.map((s) => (
          <span key={s.label}>
            {s.label}{" "}
            <span className={`font-semibold ${s.danger ? "text-[#c9372c]" : "text-slate-900"}`}>
              {s.value}
            </span>
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void loadTickets()}
            placeholder="Search tickets"
            className="h-8 w-60 pl-8"
          />
        </div>
        <div className="flex rounded-[3px] bg-[#091e420f] p-0.5">
          {queueTabs.map((tab) => {
            const active = view === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setView(tab.key)}
                className={`h-7 rounded-[3px] px-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-white text-ourcloud-700 shadow-card"
                    : "text-slate-600 hover:bg-[#091e420f]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <Button
          variant={showFilters ? "default" : "secondary"}
          onClick={() => setShowFilters((v) => !v)}
        >
          <ListFilter className="mr-1.5 h-4 w-4" />
          Filter
        </Button>
      </div>

      {showFilters && metadata && (
        <div className="relative mt-3 rounded-[4px] border border-slate-200 bg-slate-50 p-4">
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

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 text-left text-xs font-semibold text-slate-500">
              <th className="w-10 px-2 py-2">Type</th>
              <th className="w-28 px-2 py-2">Key</th>
              <th className="px-2 py-2">Summary</th>
              <th className="px-2 py-2">Customer</th>
              <th className="px-2 py-2">Assignee</th>
              <th className="w-28 px-2 py-2">Priority</th>
              <th className="w-40 px-2 py-2">Status</th>
              <th className="w-28 px-2 py-2">Time to resolution</th>
            </tr>
          </thead>
          <tbody>
            {loading && tickets.length === 0 && (
              <tr>
                <td colSpan={8} className="px-2 py-10 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && tickets.length === 0 && (
              <tr>
                <td colSpan={8} className="px-2 py-10 text-center text-slate-500">
                  No tickets match this view.
                </td>
              </tr>
            )}
            {tickets.map((ticket) => {
              const sla = slaLabel(ticket.resolutionDueAt, ticket.status.category);
              const href = `/app/tickets/${ticket.id}`;
              return (
                <tr
                  key={ticket.id}
                  onClick={() => router.push(href)}
                  className="h-10 cursor-pointer border-b border-slate-200 hover:bg-slate-100"
                >
                  <td className="px-2">
                    <TypeIcon name={ticket.ticketType?.name} />
                  </td>
                  <td className="whitespace-nowrap px-2">
                    <Link href={href} className="text-ourcloud-700 hover:underline" onClick={(e) => e.stopPropagation()}>
                      {ticket.ticketNumber}
                    </Link>
                  </td>
                  <td className="px-2">
                    <Link href={href} className="block min-w-[220px] max-w-[440px] truncate text-slate-900 hover:underline" onClick={(e) => e.stopPropagation()}>
                      {ticket.subject}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-2 text-slate-900">{ticket.organisation.name}</td>
                  <td className="whitespace-nowrap px-2">
                    <span className="inline-flex items-center gap-2">
                      <Avatar name={ticket.assignee?.name} size={24} />
                      <span className={ticket.assignee ? "text-slate-900" : "text-slate-500"}>
                        {ticket.assignee?.name ?? "Unassigned"}
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2">
                    <PriorityLabel name={ticket.priority.name} />
                  </td>
                  <td className="px-2">
                    <StatusLozenge status={ticket.status} />
                  </td>
                  <td
                    className={`whitespace-nowrap px-2 ${
                      typeof sla === "object" && sla.breached ? "font-medium text-[#c9372c]" : "text-slate-600"
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
          <p className="px-2 py-3 text-xs text-slate-500">
            {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"} · last updated {formatDate(tickets[0]?.updatedAt)}
          </p>
        )}
      </div>
    </div>
  );
}
