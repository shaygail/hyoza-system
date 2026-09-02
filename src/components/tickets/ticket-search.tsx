"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Input, Select, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  organisation: { name: string };
  status: { name: string; color: string };
  priority: { name: string; color: string };
  assignee: { name: string } | null;
  updatedAt: string;
}

interface Metadata {
  priorities: { id: string; name: string }[];
  users: { id: string; name: string }[];
  organisations: { id: string; name: string }[];
}

export function TicketSearch({ initialView }: { initialView?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [filters, setFilters] = useState({
    priorityId: searchParams.get("priorityId") ?? "",
    assigneeId: searchParams.get("assigneeId") ?? "",
    organisationId: searchParams.get("organisationId") ?? "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/v1/metadata").then((r) => r.json()).then(setMetadata);
  }, []);

  useEffect(() => {
    if (initialView && initialView !== "all") {
      fetch(`/api/v1/tickets?view=${initialView}`)
        .then((r) => r.json())
        .then(setTickets);
      return;
    }
    search();
  }, [initialView]);

  async function search() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filters.priorityId) params.set("priorityId", filters.priorityId);
    if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
    if (filters.organisationId) params.set("organisationId", filters.organisationId);
    const res = await fetch(`/api/v1/search/tickets?${params}`);
    setTickets(await res.json());
    setLoading(false);
  }

  return (
    <div className="flex gap-4">
        <div className="w-64 shrink-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <Label>Search</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ticket #, subject, customer..." />
          </div>
          {metadata && (
            <>
              <div>
                <Label>Priority</Label>
                <Select value={filters.priorityId} onChange={(e) => setFilters({ ...filters, priorityId: e.target.value })}>
                  <option value="">All</option>
                  {metadata.priorities.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Assignee</Label>
                <Select value={filters.assigneeId} onChange={(e) => setFilters({ ...filters, assigneeId: e.target.value })}>
                  <option value="">All</option>
                  <option value="unassigned">Unassigned</option>
                  {metadata.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Customer</Label>
                <Select value={filters.organisationId} onChange={(e) => setFilters({ ...filters, organisationId: e.target.value })}>
                  <option value="">All</option>
                  {metadata.organisations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </Select>
              </div>
            </>
          )}
          <Button onClick={search} disabled={loading} className="w-full">
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>

        <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">#</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Subject</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Priority</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/app/tickets/${ticket.id}`} className="font-mono text-ourcloud-600 hover:underline">
                      {ticket.ticketNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">{ticket.subject}</td>
                  <td className="px-4 py-3 text-slate-600">{ticket.organisation.name}</td>
                  <td className="px-4 py-3"><Badge color={ticket.status.color}>{ticket.status.name}</Badge></td>
                  <td className="px-4 py-3"><Badge color={ticket.priority.color}>{ticket.priority.name}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{ticket.assignee?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </div>
  );
}
