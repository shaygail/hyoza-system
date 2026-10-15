"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, PriorityLabel } from "@/components/ui/jira";
import { formatDate } from "@/lib/utils";

interface PortalTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: { name: string; color: string };
  priority: { name: string; color: string };
  comments: {
    id: string;
    body: string;
    createdAt: string;
    author: { name: string };
    onBehalfOfContact?: { name: string } | null;
  }[];
}

export function PortalTicketDetail({ ticket: initial }: { ticket: PortalTicket }) {
  const router = useRouter();
  const [ticket, setTicket] = useState(initial);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleReply() {
    if (!reply.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/portal/tickets/${ticket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to send reply");
        return;
      }
      setReply("");
      const refresh = await fetch(`/api/v1/portal/tickets/${ticket.id}`);
      if (refresh.ok) setTicket(await refresh.json());
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/portal" className="hover:underline">Help center</Link>
        <span>/</span>
        <Link href="/portal/tickets" className="hover:underline">Requests</Link>
        <span>/</span>
        <span>{ticket.ticketNumber}</span>
      </nav>
      <div className="rounded-[4px] bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600">{ticket.ticketNumber}</span>
          <Badge color={ticket.status.color}>{ticket.status.name}</Badge>
          <PriorityLabel name={ticket.priority.name} />
        </div>
        <h1 className="mt-2 text-2xl font-medium text-slate-900">{ticket.subject}</h1>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-900">{ticket.description}</p>
      </div>

      <div className="rounded-[4px] bg-white p-6 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Activity</h2>
        <div className="space-y-5">
          {ticket.comments.map((c) => {
            const name = c.onBehalfOfContact?.name ?? c.author.name;
            return (
              <div key={c.id} className="flex gap-3 text-sm">
                <Avatar name={name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{name}</span>
                    {c.onBehalfOfContact && <span className="text-slate-500">via support</span>}
                    <span className="text-slate-500">{formatDate(c.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap leading-6 text-slate-900">{c.body}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 space-y-2 border-t border-slate-200 pt-4">
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply..." />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleReply} disabled={loading}>
            {loading ? "Sending..." : "Add comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
