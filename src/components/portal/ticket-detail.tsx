"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface PortalTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: { name: string; color: string };
  priority: { name: string; color: string };
  comments: { id: string; body: string; createdAt: string; author: { name: string } }[];
}

export function PortalTicketDetail({ ticket: initial }: { ticket: PortalTicket }) {
  const router = useRouter();
  const [ticket, setTicket] = useState(initial);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReply() {
    if (!reply.trim()) return;
    setLoading(true);
    await fetch(`/api/v1/portal/tickets/${ticket.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply }),
    });
    setReply("");
    setLoading(false);
    const res = await fetch(`/api/v1/portal/tickets/${ticket.id}`);
    setTicket(await res.json());
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Link href="/portal/tickets" className="text-sm text-ourcloud-600 hover:underline">← My Tickets</Link>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-ourcloud-600">{ticket.ticketNumber}</span>
          <Badge color={ticket.status.color}>{ticket.status.name}</Badge>
          <Badge color={ticket.priority.color}>{ticket.priority.name}</Badge>
        </div>
        <h1 className="mt-2 text-xl font-semibold">{ticket.subject}</h1>
        <p className="mt-4 text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-medium">Conversation</h2>
        <div className="space-y-3">
          {ticket.comments.map((c) => (
            <div key={c.id} className="rounded-lg border-l-4 border-blue-400 bg-blue-50 p-3 text-sm">
              <div className="text-xs text-blue-600">{c.author.name} · {formatDate(c.createdAt)}</div>
              <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply..." />
          <Button onClick={handleReply} disabled={loading}>Send Reply</Button>
        </div>
      </div>
    </div>
  );
}
