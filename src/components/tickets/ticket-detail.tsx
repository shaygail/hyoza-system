"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { getActivityLabel } from "@/domain/activity";
import Link from "next/link";
import { Paperclip, MessageSquare, Lock, Clock, Columns3 } from "lucide-react";

interface TicketData {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  resolutionSummary: string | null;
  organisation: { id: string; name: string };
  contact: { name: string } | null;
  assignee: { id: string; name: string } | null;
  team: { name: string } | null;
  status: { id: string; name: string; color: string; code: string };
  priority: { id: string; name: string; color: string };
  ticketType: { name: string };
  resolutionDueAt?: string | null;
  timeEntries?: { id: string; durationMinutes: number; notes: string | null; user: { name: string }; workType: { name: string } | null }[];
  asset?: { assetTag: string; name: string } | null;
  comments: { id: string; body: string; createdAt: string; author: { name: string } }[];
  internalNotes: { id: string; body: string; createdAt: string; author: { name: string } }[];
  attachments: { id: string; fileName: string; sizeBytes: number; createdAt: string; uploadedBy: { name: string } }[];
  activities: { id: string; eventType: string; payload: string; visibility: string; createdAt: string; actor: { name: string } | null }[];
}

interface Transition {
  id: string;
  name: string;
  requiredFields: string;
  toStatus: { name: string; code: string };
}

interface Metadata {
  users: { id: string; name: string }[];
  priorities: { id: string; name: string }[];
  workTypes?: { id: string; name: string }[];
}

type TimelineFilter = "all" | "customer" | "internal" | "system";

export function TicketDetailClient({
  ticket: initialTicket,
  transitions,
  metadata,
}: {
  ticket: TicketData;
  transitions: Transition[];
  metadata: Metadata;
}) {
  const router = useRouter();
  const [ticket, setTicket] = useState(initialTicket);
  const [replyBody, setReplyBody] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [composeMode, setComposeMode] = useState<"reply" | "note" | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [resolveModal, setResolveModal] = useState<Transition | null>(null);
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [loading, setLoading] = useState(false);

  async function refreshTicket() {
    const res = await fetch(`/api/v1/tickets/${ticket.id}`);
    if (res.ok) setTicket(await res.json());
    router.refresh();
  }

  async function handleReply() {
    if (!replyBody.trim()) return;
    setLoading(true);
    await fetch(`/api/v1/tickets/${ticket.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: replyBody }),
    });
    setReplyBody("");
    setComposeMode(null);
    setLoading(false);
    await refreshTicket();
  }

  async function handleInternalNote() {
    if (!noteBody.trim()) return;
    setLoading(true);
    await fetch(`/api/v1/tickets/${ticket.id}/internal-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteBody }),
    });
    setNoteBody("");
    setComposeMode(null);
    setLoading(false);
    await refreshTicket();
  }

  async function handleTransition(transition: Transition) {
    const required: string[] = JSON.parse(transition.requiredFields);
    if (required.includes("resolution_summary")) {
      setResolveModal(transition);
      return;
    }
    setLoading(true);
    await fetch(`/api/v1/tickets/${ticket.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transitionId: transition.id }),
    });
    setLoading(false);
    await refreshTicket();
  }

  async function handleResolve() {
    if (!resolveModal) return;
    setLoading(true);
    await fetch(`/api/v1/tickets/${ticket.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transitionId: resolveModal.id,
        fields: { resolution_summary: resolutionSummary },
      }),
    });
    setResolveModal(null);
    setResolutionSummary("");
    setLoading(false);
    await refreshTicket();
  }

  async function handleLogTime(minutes: number) {
    setLoading(true);
    await fetch("/api/v1/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket.id, durationMinutes: minutes }),
    });
    setLoading(false);
    await refreshTicket();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    await fetch(`/api/v1/tickets/${ticket.id}/attachments`, { method: "POST", body: formData });
    setLoading(false);
    await refreshTicket();
  }

  type TimelineItem =
    | { type: "comment"; data: TicketData["comments"][0] }
    | { type: "note"; data: TicketData["internalNotes"][0] }
    | { type: "activity"; data: TicketData["activities"][0] };

  const timeline: TimelineItem[] = [
    ...ticket.comments.map((c) => ({ type: "comment" as const, data: c })),
    ...ticket.internalNotes.map((n) => ({ type: "note" as const, data: n })),
    ...ticket.activities.map((a) => ({ type: "activity" as const, data: a })),
  ].sort((a, b) => new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime());

  const filteredTimeline = timeline.filter((item) => {
    if (timelineFilter === "all") return true;
    if (timelineFilter === "customer") return item.type === "comment" || (item.type === "activity" && item.data.visibility === "customer");
    if (timelineFilter === "internal") return item.type === "note" || (item.type === "activity" && item.data.visibility === "internal");
    if (timelineFilter === "system") return item.type === "activity";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/app/tickets" className="hover:text-ourcloud-600">Tickets</Link>
        <span>/</span>
        <Link href="/app/board" className="hover:text-ourcloud-600 flex items-center gap-1">
          <Columns3 className="h-3 w-3" /> Board
        </Link>
        <span>/</span>
        <span className="font-mono text-ourcloud-600">{ticket.ticketNumber}</span>
      </nav>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main content — issue body */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-2 text-sm">
                <Badge color={ticket.ticketType.name === "Incident" ? "#ef4444" : "#3b82f6"}>{ticket.ticketType.name}</Badge>
                <span className="font-mono text-ourcloud-600">{ticket.ticketNumber}</span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">{ticket.subject}</h1>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-slate-200 px-6 py-3 bg-slate-50">
              <Button variant="reply" size="sm" onClick={() => setComposeMode(composeMode === "reply" ? null : "reply")}>
                <MessageSquare className="mr-2 h-4 w-4" />Reply
              </Button>
              <Button variant="internal" size="sm" onClick={() => setComposeMode(composeMode === "note" ? null : "note")}>
                <Lock className="mr-2 h-4 w-4" />Internal Note
              </Button>
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                <Paperclip className="mr-2 h-4 w-4" />Attach
                <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>
              <Button variant="secondary" size="sm" onClick={() => handleLogTime(15)} disabled={loading}>
                <Clock className="mr-2 h-4 w-4" />15m
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleLogTime(30)} disabled={loading}>30m</Button>
            </div>

            <div className="px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-2">Description</h2>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
              {ticket.resolutionSummary && (
                <>
                  <h2 className="text-sm font-semibold text-slate-700 mt-4 mb-2">Resolution</h2>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.resolutionSummary}</p>
                </>
              )}
            </div>
          </div>

          {composeMode === "reply" && (
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
              <p className="mb-2 text-xs font-medium text-blue-700">Reply to Customer</p>
              <Textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Type your reply..." />
              <div className="mt-2 flex gap-2">
                <Button variant="reply" size="sm" onClick={handleReply} disabled={loading}>Send Reply</Button>
                <Button variant="ghost" size="sm" onClick={() => setComposeMode(null)}>Cancel</Button>
              </div>
            </div>
          )}

          {composeMode === "note" && (
            <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
              <p className="mb-2 text-xs font-medium text-amber-700">Internal Note</p>
              <Textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Type internal note..." />
              <div className="mt-2 flex gap-2">
                <Button variant="internal" size="sm" onClick={handleInternalNote} disabled={loading}>Add Note</Button>
                <Button variant="ghost" size="sm" onClick={() => setComposeMode(null)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="font-medium text-slate-900">Activity</h2>
              <div className="flex gap-1">
                {(["all", "customer", "internal", "system"] as TimelineFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTimelineFilter(f)}
                    className={`rounded px-2 py-1 text-xs font-medium capitalize ${
                      timelineFilter === f ? "bg-ourcloud-100 text-ourcloud-700" : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-slate-100 p-4 space-y-4">
              {filteredTimeline.length === 0 && <p className="text-sm text-slate-500">No activity yet.</p>}
              {filteredTimeline.map((item) => {
                if (item.type === "comment") {
                  return (
                    <div key={`c-${item.data.id}`} className="rounded-lg border-l-4 border-blue-500 bg-blue-50/50 p-3">
                      <div className="flex items-center gap-2 text-xs text-blue-700">
                        <MessageSquare className="h-3 w-3" />
                        <span className="font-medium">{item.data.author.name}</span>
                        <span>{formatDate(item.data.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{item.data.body}</p>
                    </div>
                  );
                }
                if (item.type === "note") {
                  return (
                    <div key={`n-${item.data.id}`} className="rounded-lg border-l-4 border-amber-500 bg-amber-50/50 p-3">
                      <div className="flex items-center gap-2 text-xs text-amber-700">
                        <Lock className="h-3 w-3" />
                        <span className="font-medium">{item.data.author.name}</span>
                        <span>{formatDate(item.data.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{item.data.body}</p>
                    </div>
                  );
                }
                const payload = JSON.parse(item.data.payload || "{}");
                return (
                  <div key={`a-${item.data.id}`} className="text-xs text-slate-500">
                    {getActivityLabel(item.data.eventType, payload)}
                    {item.data.actor && ` — ${item.data.actor.name}`}
                    <span className="ml-2">{formatDate(item.data.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right sidebar — issue details */}
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-700">Details</h2>
            </div>
            <dl className="divide-y divide-slate-100 text-sm">
              <DetailRow label="Status">
                <Badge color={ticket.status.color}>{ticket.status.name}</Badge>
              </DetailRow>
              <DetailRow label="Priority">
                <Badge color={ticket.priority.color}>{ticket.priority.name}</Badge>
              </DetailRow>
              <DetailRow label="Assignee">
                {ticket.assignee?.name ?? <span className="text-slate-400">Unassigned</span>}
              </DetailRow>
              <DetailRow label="Customer">{ticket.organisation.name}</DetailRow>
              {ticket.contact && <DetailRow label="Contact">{ticket.contact.name}</DetailRow>}
              <DetailRow label="Team">{ticket.team?.name ?? "—"}</DetailRow>
              <DetailRow label="Type">{ticket.ticketType.name}</DetailRow>
              {ticket.resolutionDueAt && (
                <DetailRow label="SLA Due">{formatDate(ticket.resolutionDueAt)}</DetailRow>
              )}
              {ticket.asset && <DetailRow label="Asset">{ticket.asset.assetTag}</DetailRow>}
            </dl>
          </div>

          {transitions.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Workflow</h2>
              <div className="flex flex-col gap-2">
                {transitions.map((t) => (
                  <Button key={t.id} variant="secondary" size="sm" className="justify-start" onClick={() => handleTransition(t)} disabled={loading}>
                    {t.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {ticket.timeEntries && ticket.timeEntries.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-2">Time</h2>
              <p className="text-2xl font-semibold text-ourcloud-700">
                {ticket.timeEntries.reduce((s, e) => s + e.durationMinutes, 0)}m
              </p>
              <p className="text-xs text-slate-500">logged on this ticket</p>
            </div>
          )}

          {ticket.attachments.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-2">Attachments</h2>
              <ul className="space-y-1 text-sm">
                {ticket.attachments.map((a) => (
                  <li key={a.id}>
                    <a href={`/api/v1/tickets/${ticket.id}/attachments/${a.id}`} className="text-ourcloud-600 hover:underline">
                      {a.fileName}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="font-semibold text-slate-900">Resolve Ticket</h3>
            <p className="mt-1 text-sm text-slate-500">Please provide a resolution summary.</p>
            <Textarea
              className="mt-4"
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              placeholder="Describe how the issue was resolved..."
            />
            <div className="mt-4 flex gap-2">
              <Button onClick={handleResolve} disabled={loading || !resolutionSummary.trim()}>Resolve</Button>
              <Button variant="secondary" onClick={() => setResolveModal(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3">
      <dt className="text-slate-500 shrink-0">{label}</dt>
      <dd className="font-medium text-slate-900 text-right">{children}</dd>
    </div>
  );
}
