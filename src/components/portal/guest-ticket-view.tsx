"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface GuestTicket {
  ticketNumber: string;
  subject: string;
  description: string;
  status: { name: string; color: string };
  priority: { name: string; color: string };
  contactName: string;
  comments: {
    id: string;
    body: string;
    createdAt: string;
    authorName: string;
    isFromSupport: boolean;
  }[];
}

export function GuestTicketView({ token }: { token: string }) {
  const [ticket, setTicket] = useState<GuestTicket | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  async function load() {
    const res = await fetch(`/api/v1/public/tickets/${token}`);
    if (!res.ok) {
      setNotFound(true);
      return;
    }
    setTicket(await res.json());
  }

  useEffect(() => {
    load();
  }, [token]);

  async function handleReply() {
    if (!reply.trim()) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/v1/public/tickets/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to send reply");
      return;
    }
    setReply("");
    await load();
  }

  if (notFound) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-600">This ticket link is invalid or has expired.</p>
      </div>
    );
  }

  if (!ticket) {
    return <p className="text-slate-500">Loading ticket...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-slate-500">{ticket.ticketNumber}</span>
          <Badge color={ticket.status.color}>{ticket.status.name}</Badge>
          <Badge color={ticket.priority.color}>{ticket.priority.name}</Badge>
        </div>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">{ticket.subject}</h1>
        <p className="mt-4 text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-medium text-slate-900">Conversation</h2>
        <div className="space-y-3">
          {ticket.comments.length === 0 && (
            <p className="text-sm text-slate-500">No replies yet. Our team will respond soon.</p>
          )}
          {ticket.comments.map((c) => (
            <div
              key={c.id}
              className={`rounded-lg border-l-4 p-3 text-sm ${
                c.isFromSupport
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-blue-400 bg-blue-50"
              }`}
            >
              <div className={`text-xs ${c.isFromSupport ? "text-emerald-700" : "text-blue-600"}`}>
                {c.authorName}
                {c.isFromSupport ? " · Support team" : ""}
                {" · "}
                {formatDate(c.createdAt)}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-slate-700">{c.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">Reply as {ticket.contactName}</p>
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply..." />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleReply} disabled={loading}>
            {loading ? "Sending..." : "Send reply"}
          </Button>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        Bookmark this page to check your ticket anytime. We&apos;ll also email you when there are updates.
      </p>
    </div>
  );
}
