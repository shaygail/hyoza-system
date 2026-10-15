"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea, Select } from "@/components/ui/input";
import { SoftBadge } from "@/components/ui/badge";
import { Avatar, PriorityIcon, PriorityLabel, TypeIcon } from "@/components/ui/jira";
import { SearchSelect } from "@/components/ui/search-select";
import { MentionTextarea } from "@/components/ui/mention-textarea";
import { TicketWorkTimer } from "@/components/tickets/ticket-work-timer";
import { formatDate } from "@/lib/utils";
import { getActivityLabel } from "@/lib/activity-labels";
import { mentionHandle, resolveMentionedUserIds, stripMentionFromBody } from "@/lib/mentions";
import Link from "next/link";
import { Paperclip, MessageSquare, Lock, Clock, UserPlus, X, ChevronDown } from "lucide-react";

interface TicketData {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  resolutionSummary: string | null;
  organisation: { id: string; name: string };
  contact: { name: string; user?: { id: string; name: string } | null } | null;
  assignee: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  category: { id: string; name: string; code: string } | null;
  status: { id: string; name: string; color: string; code: string; category?: string };
  priority: { id: string; name: string; color: string };
  ticketType: { name: string };
  resolutionDueAt?: string | null;
  timeEntries?: { id: string; durationMinutes: number; notes: string | null; user: { name: string }; workType: { name: string } | null }[];
  asset?: { assetTag: string; name: string } | null;
  comments: { id: string; body: string; createdAt: string; author: { name: string }; onBehalfOfContact?: { name: string } | null }[];
  internalNotes: {
    id: string;
    body: string;
    createdAt: string;
    author: { name: string };
    taggedUsers: { id: string; name: string; email: string }[];
  }[];
  attachments: { id: string; fileName: string; sizeBytes: number; createdAt: string; uploadedBy: { name: string } }[];
  activities: { id: string; eventType: string; payload: string; visibility: string; createdAt: string; actor: { name: string } | null }[];
  watchers?: {
    id: string;
    reason: string;
    createdAt: string;
    user: { id: string; name: string; email: string };
    taggedBy: { id: string; name: string };
  }[];
}

interface Transition {
  id: string;
  name: string;
  requiredFields: string;
  toStatus: { name: string; code: string };
}

interface Metadata {
  technicians: { id: string; name: string; email: string }[];
  priorities: { id: string; name: string }[];
  routingCategories: { id: string; name: string; code: string }[];
  workTypes?: { id: string; name: string }[];
  currentUserName?: string;
  currentUserId?: string;
}

interface RelatedTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: { name: string; color: string };
  priority: { name: string; color: string };
  updatedAt: string;
}

type TimelineFilter = "all" | "customer" | "internal" | "system";

export function TicketDetailClient({
  ticket: initialTicket,
  transitions,
  metadata,
  relatedTickets = [],
}: {
  ticket: TicketData;
  transitions: Transition[];
  metadata: Metadata;
  relatedTickets?: RelatedTicket[];
}) {
  const router = useRouter();
  const [ticket, setTicket] = useState(initialTicket);
  const [replyBody, setReplyBody] = useState("");
  const [replyAs, setReplyAs] = useState<"agent" | "contact">("agent");
  const [replyError, setReplyError] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [taggedAgentIds, setTaggedAgentIds] = useState<string[]>([]);
  const [watchers, setWatchers] = useState(initialTicket.watchers ?? []);
  const [watcherIds, setWatcherIds] = useState<string[]>([]);
  const [watcherComment, setWatcherComment] = useState("");
  const [watcherSaving, setWatcherSaving] = useState(false);
  const [watcherError, setWatcherError] = useState("");
  const [composeMode, setComposeMode] = useState<"reply" | "note" | "escalate" | "time" | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [resolveModal, setResolveModal] = useState<Transition | null>(null);
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [timeMinutes, setTimeMinutes] = useState(15);
  const [timeNotes, setTimeNotes] = useState("");
  const [timeError, setTimeError] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  async function refreshTicket() {
    const res = await fetch(`/api/v1/tickets/${ticket.id}`);
    if (res.ok) {
      const data = await res.json();
      setTicket(data);
      if (data.watchers) setWatchers(data.watchers);
    }
    router.refresh();
  }

  async function updateTicketDetails(data: { assigneeId?: string | null; categoryId?: string | null }) {
    setDetailsSaving(true);
    setDetailsError("");
    try {
      const res = await fetch(`/api/v1/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetailsError(payload.error ?? "Failed to update ticket");
        return;
      }
      setTicket(payload);
      router.refresh();
    } finally {
      setDetailsSaving(false);
    }
  }

  async function handleReply() {
    if (!replyBody.trim()) return;
    setLoading(true);
    setReplyError("");
    try {
      const res = await fetch(`/api/v1/tickets/${ticket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody, replyAs }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReplyError(data.error ?? "Failed to send reply");
        return;
      }
      setReplyBody("");
      setReplyAs("agent");
      setComposeMode(null);
      await refreshTicket();
    } finally {
      setLoading(false);
    }
  }


  async function handleInternalNote() {
    if (!noteBody.trim()) return;
    const fromText = resolveMentionedUserIds(noteBody, metadata.technicians);
    const taggedUserIds = [...new Set([...taggedAgentIds, ...fromText])];
    setLoading(true);
    await fetch(`/api/v1/tickets/${ticket.id}/internal-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteBody, taggedUserIds }),
    });
    setNoteBody("");
    setTaggedAgentIds([]);
    setComposeMode(null);
    setLoading(false);
    await refreshTicket();
  }

  function removeMentionedAgent(agentId: string) {
    const agent = metadata.technicians.find((t) => t.id === agentId);
    setTaggedAgentIds((current) => current.filter((id) => id !== agentId));
    if (agent) setNoteBody((body) => stripMentionFromBody(body, agent));
  }

  function removeWatcherMention(agentId: string) {
    const agent = metadata.technicians.find((t) => t.id === agentId);
    setWatcherIds((current) => current.filter((id) => id !== agentId));
    if (agent) setWatcherComment((body) => stripMentionFromBody(body, agent));
  }

  async function handleTagWatchers() {
    const fromText = resolveMentionedUserIds(watcherComment, metadata.technicians);
    const taggedUserIds = [...new Set([...watcherIds, ...fromText])];
    if (taggedUserIds.length === 0 || !watcherComment.trim()) {
      setWatcherError("Add a comment and @mention at least one person.");
      return;
    }
    setWatcherSaving(true);
    setWatcherError("");
    try {
      const res = await fetch(`/api/v1/tickets/${ticket.id}/internal-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: watcherComment.trim(), taggedUserIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setWatcherError(data.error ?? "Failed to tag for review");
        return;
      }
      setWatcherComment("");
      setWatcherIds([]);
      await refreshTicket();
    } finally {
      setWatcherSaving(false);
    }
  }

  async function handleRemoveWatcher(userId: string) {
    setWatcherSaving(true);
    try {
      const res = await fetch(`/api/v1/tickets/${ticket.id}/watchers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", userId }),
      });
      if (res.ok) {
        setWatchers(await res.json());
        await refreshTicket();
      }
    } finally {
      setWatcherSaving(false);
    }
  }

  const slaAtRisk =
    ticket.resolutionDueAt &&
    new Date(ticket.resolutionDueAt).getTime() - Date.now() < 24 * 60 * 60 * 1000 &&
    !["resolved", "closed", "cancelled"].includes(ticket.status.code);

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

  async function handleLogTime() {
    if (!timeNotes.trim()) {
      setTimeError("Notes are required when logging time.");
      return;
    }
    if (!Number.isFinite(timeMinutes) || timeMinutes < 1) {
      setTimeError("Enter at least 1 minute.");
      return;
    }
    setLoading(true);
    setTimeError("");
    try {
      const res = await fetch("/api/v1/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          durationMinutes: timeMinutes,
          notes: timeNotes.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTimeError(data.error ?? "Failed to log time");
        return;
      }
      setTimeNotes("");
      setTimeMinutes(15);
      setComposeMode(null);
      await refreshTicket();
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-full">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/app/dashboard" className="hover:underline">
          Projects
        </Link>
        <span>/</span>
        <Link href="/app/tickets" className="hover:underline">
          HYOZA Service Desk
        </Link>
        <span>/</span>
        <span className="inline-flex items-center gap-1.5">
          <TypeIcon name={ticket.ticketType.name} />
          <Link href={`/app/tickets/${ticket.id}`} className="hover:underline">
            {ticket.ticketNumber}
          </Link>
        </span>
      </nav>

      <div className="mt-3 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <div>
            <h1 className="text-2xl font-medium text-slate-900">{ticket.subject}</h1>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <Button
                variant="secondary"
                onClick={() => {
                  setComposeMode(composeMode === "reply" ? null : "reply");
                  setReplyError("");
                }}
              >
                <MessageSquare className="mr-1.5 h-4 w-4" />
                Reply to customer
              </Button>
              <Button
                variant="secondary"
                onClick={() => setComposeMode(composeMode === "note" ? null : "note")}
              >
                <Lock className="mr-1.5 h-4 w-4" />
                Add internal note
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setComposeMode(composeMode === "escalate" ? null : "escalate");
                  setWatcherError("");
                }}
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                Escalation review
                {watchers.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 text-[11px] font-semibold text-slate-700">
                    {watchers.length}
                  </span>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setComposeMode(composeMode === "time" ? null : "time");
                  setTimeError("");
                }}
              >
                <Clock className="mr-1.5 h-4 w-4" />
                Log time
              </Button>
              <label className="inline-flex h-8 cursor-pointer items-center rounded-[3px] bg-[#091e420f] px-3 text-sm font-medium text-slate-600 hover:bg-[#091e4224]">
                <Paperclip className="mr-1.5 h-4 w-4" />
                Attach
                <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            <div className="mt-6">
              <h2 className="text-base font-semibold text-slate-900">Description</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-900">
                {ticket.description}
              </p>
              {ticket.resolutionSummary && (
                <>
                  <h2 className="mt-6 text-base font-semibold text-slate-900">Resolution</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-900">
                    {ticket.resolutionSummary}
                  </p>
                </>
              )}
            </div>

            {ticket.attachments.length > 0 && (
              <div className="mt-6">
                <h2 className="text-base font-semibold text-slate-900">
                  Attachments <span className="font-normal text-slate-500">{ticket.attachments.length}</span>
                </h2>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {ticket.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={`/api/v1/tickets/${ticket.id}/attachments/${a.id}`}
                        className="inline-flex items-center gap-2 rounded-[3px] border border-slate-200 px-3 py-2 text-sm text-slate-900 hover:bg-slate-50"
                      >
                        <Paperclip className="h-4 w-4 text-slate-500" />
                        {a.fileName}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {composeMode === "reply" && (
            <div className="rounded-[4px] border border-slate-200 bg-white p-4 shadow-card">
              <p className="mb-2 text-sm font-semibold text-slate-900">Reply to customer</p>
              <div className="mb-3 flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="replyAs"
                    checked={replyAs === "agent"}
                    onChange={() => setReplyAs("agent")}
                  />
                  As agent ({metadata.currentUserName ?? "you"})
                </label>
                {ticket.contact && (
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="replyAs"
                      checked={replyAs === "contact"}
                      onChange={() => setReplyAs("contact")}
                    />
                    As customer ({ticket.contact.name})
                  </label>
                )}
              </div>
              {replyAs === "contact" && !ticket.contact?.user && ticket.contact && (
                <p className="mb-2 text-xs text-amber-700">
                  This contact does not have a portal login yet — the reply will still appear under their name.
                  Enable portal access in{" "}
                  <Link href={`/app/customers/${ticket.organisation.id}`} className="underline">
                    Customers
                  </Link>{" "}
                  so they can see it when they sign in.
                </p>
              )}
              <Textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Type your reply..." />
              {replyError && <p className="mt-2 text-xs text-red-600">{replyError}</p>}
              <div className="mt-2 flex gap-2">
                <Button onClick={handleReply} disabled={loading}>
                  {replyAs === "contact" ? `Send as ${ticket.contact?.name}` : "Send reply"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setComposeMode(null); setReplyError(""); }}>Cancel</Button>
              </div>
            </div>
          )}

          {composeMode === "note" && (
            <div className="rounded-[4px] border border-[#f5cd47] bg-[#fff7d6] p-4">
              <p className="mb-2 text-sm font-semibold text-[#7f5f01]">Internal note · not visible to customer</p>
              <MentionTextarea
                value={noteBody}
                onChange={setNoteBody}
                users={metadata.technicians}
                mentionedIds={taggedAgentIds}
                onMentionedIdsChange={setTaggedAgentIds}
                placeholder="Type note… use @ to mention staff"
                className="border-amber-200"
              />
              {taggedAgentIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {taggedAgentIds.map((agentId) => {
                    const agent = metadata.technicians.find((t) => t.id === agentId);
                    if (!agent) return null;
                    return (
                      <span
                        key={agentId}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                      >
                        @{mentionHandle(agent, metadata.technicians)}
                        <button
                          type="button"
                          onClick={() => removeMentionedAgent(agentId)}
                          className="rounded-full hover:bg-amber-200"
                          aria-label={`Remove ${agent.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <Button variant="internal" onClick={handleInternalNote} disabled={loading}>Save note</Button>
                <Button variant="ghost" size="sm" onClick={() => { setComposeMode(null); setTaggedAgentIds([]); setNoteBody(""); }}>Cancel</Button>
              </div>
            </div>
          )}

          {composeMode === "escalate" && (
            <div className="rounded-[4px] border border-slate-200 bg-slate-50 p-4">
              <p className="mb-1 text-sm font-semibold text-slate-900">Escalation review</p>
              <p className="mb-3 text-xs text-slate-500">
                Write a comment and @mention staff to check this ticket
                {slaAtRisk ? " (SLA due soon)." : "."} They get the note by email and stay listed as reviewers.
              </p>
              {watchers.length > 0 && (
                <ul className="mb-3 space-y-1.5">
                  {watchers.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{w.user.name}</p>
                        <p className="truncate text-xs text-slate-500">{w.user.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveWatcher(w.user.id)}
                        disabled={watcherSaving}
                        className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <MentionTextarea
                value={watcherComment}
                onChange={setWatcherComment}
                users={metadata.technicians}
                mentionedIds={watcherIds}
                onMentionedIdsChange={setWatcherIds}
                placeholder="Why they should check this… type @ to mention"
                className="mb-2 min-h-[72px] text-sm"
                minRows={3}
              />
              {watcherIds.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {watcherIds.map((agentId) => {
                    const agent = metadata.technicians.find((t) => t.id === agentId);
                    if (!agent) return null;
                    return (
                      <span
                        key={agentId}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700"
                      >
                        @{mentionHandle(agent, metadata.technicians)}
                        <button
                          type="button"
                          onClick={() => removeWatcherMention(agentId)}
                          aria-label={`Remove ${agent.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              {watcherError && <p className="mb-2 text-xs text-red-600">{watcherError}</p>}
              <div className="mt-2 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await handleTagWatchers();
                  }}
                  disabled={watcherSaving || !watcherComment.trim()}
                >
                  Comment & tag
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setComposeMode(null);
                    setWatcherComment("");
                    setWatcherIds([]);
                    setWatcherError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {composeMode === "time" && (
            <div className="rounded-[4px] border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-900">Log time</p>
              <p className="mb-3 text-xs text-slate-500">Notes are required for every time entry.</p>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label className="text-sm text-slate-600">
                  Minutes
                  <input
                    type="number"
                    min={1}
                    value={timeMinutes}
                    onChange={(e) => setTimeMinutes(Number(e.target.value))}
                    className="ml-2 w-20 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                {[15, 30, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTimeMinutes(m)}
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      timeMinutes === m ? "bg-ourcloud-100 text-ourcloud-700" : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
              <Textarea
                value={timeNotes}
                onChange={(e) => setTimeNotes(e.target.value)}
                placeholder="What did you work on?"
                className="min-h-[80px]"
              />
              {timeError && <p className="mt-2 text-xs text-red-600">{timeError}</p>}
              <div className="mt-2 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLogTime}
                  disabled={loading || !timeNotes.trim()}
                >
                  Save time
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setComposeMode(null);
                    setTimeNotes("");
                    setTimeError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-base font-semibold text-slate-900">Activity</h2>
            <div className="mt-2 flex items-center gap-1 text-sm">
              <span className="mr-1 text-slate-500">Show:</span>
              {(["all", "customer", "internal", "system"] as TimelineFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setTimelineFilter(f)}
                  className={`h-7 rounded-[3px] px-2 font-medium capitalize transition-colors ${
                    timelineFilter === f
                      ? "bg-ourcloud-50 text-ourcloud-700"
                      : "bg-[#091e420f] text-slate-600 hover:bg-[#091e4224]"
                  }`}
                >
                  {f === "customer" ? "Comments" : f === "system" ? "History" : f}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-5">
              {filteredTimeline.length === 0 && (
                <p className="text-sm text-slate-500">No activity yet.</p>
              )}
              {filteredTimeline.map((item) => {
                if (item.type === "comment") {
                  const displayName = item.data.onBehalfOfContact
                    ? item.data.onBehalfOfContact.name
                    : item.data.author.name;
                  return (
                    <div key={`c-${item.data.id}`} className="flex gap-3">
                      <Avatar name={displayName} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold text-slate-900">{displayName}</span>
                          {item.data.onBehalfOfContact && (
                            <span className="text-slate-500">(via agent)</span>
                          )}
                          <span className="text-slate-500">{formatDate(item.data.createdAt)}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-900">
                          {item.data.body}
                        </p>
                      </div>
                    </div>
                  );
                }
                if (item.type === "note") {
                  return (
                    <div key={`n-${item.data.id}`} className="flex gap-3">
                      <Avatar name={item.data.author.name} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold text-slate-900">{item.data.author.name}</span>
                          <span className="text-slate-500">{formatDate(item.data.createdAt)}</span>
                          <span className="rounded-[3px] bg-[#f8e6a0] px-1 text-[11px] font-bold uppercase leading-4 text-[#7f5f01]">
                            Internal note
                          </span>
                        </div>
                        <div className="mt-1.5 rounded-[3px] bg-[#fff7d6] px-3 py-2">
                          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-900">
                            {item.data.body}
                          </p>
                          {item.data.taggedUsers.length > 0 && (
                            <p className="mt-1 text-xs text-[#7f5f01]">
                              <span className="font-semibold">Mentioned:</span>{" "}
                              {item.data.taggedUsers
                                .map((u) => `@${mentionHandle(u, item.data.taggedUsers)}`)
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                const payload = JSON.parse(item.data.payload || "{}");
                return (
                  <div key={`a-${item.data.id}`} className="flex items-center gap-3 text-sm">
                    <Avatar name={item.data.actor?.name ?? "System"} size={32} />
                    <p className="min-w-0 text-slate-600">
                      {item.data.actor && (
                        <span className="font-semibold text-slate-900">{item.data.actor.name} </span>
                      )}
                      {getActivityLabel(item.data.eventType, payload)}
                      <span className="ml-2 text-slate-500">{formatDate(item.data.createdAt)}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value=""
                onChange={(e) => {
                  const transition = transitions.find((t) => t.id === e.target.value);
                  if (transition) void handleTransition(transition);
                }}
                disabled={loading || transitions.length === 0}
                aria-label="Change status"
                className={`h-8 cursor-pointer appearance-none rounded-[3px] pl-3 pr-8 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ourcloud-400 disabled:cursor-default ${
                  ["resolved", "closed"].includes(ticket.status.category ?? "")
                    ? "bg-[#1f845a] text-white hover:bg-[#216e4e]"
                    : ticket.status.code === "open"
                      ? "bg-[#091e420f] text-slate-600 hover:bg-[#091e4224]"
                      : "bg-ourcloud-600 text-white hover:bg-ourcloud-700"
                }`}
              >
                <option value="">{ticket.status.name}</option>
                {transitions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.toStatus?.name ? ` → ${t.toStatus.name}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-80" />
            </div>
            {slaAtRisk && (
              <span className="rounded-[3px] bg-[#ffd5d2] px-1 text-[11px] font-bold uppercase leading-4 text-[#ae2e24]">
                SLA at risk
              </span>
            )}
          </div>

          <div className="rounded-[4px] border border-slate-200">
            <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Details</h2>
            <dl className="space-y-1 px-4 py-3 text-sm">
              <DetailRow label="Assignee">
                <SearchSelect
                  options={metadata.technicians.map((technician) => ({
                    id: technician.id,
                    label: technician.name,
                    hint: technician.email,
                  }))}
                  value={ticket.assignee?.id ?? null}
                  onChange={(assigneeId) => updateTicketDetails({ assigneeId })}
                  placeholder="Unassigned"
                  disabled={detailsSaving}
                />
              </DetailRow>
              <DetailRow label="Customer">{ticket.organisation.name}</DetailRow>
              {ticket.contact && (
                <DetailRow label="Reporter">
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={ticket.contact.name} size={24} />
                    {ticket.contact.name}
                  </span>
                </DetailRow>
              )}
              <DetailRow label="Priority">
                <PriorityLabel name={ticket.priority.name} />
              </DetailRow>
              <DetailRow label="Request type">
                <span className="inline-flex items-center gap-2">
                  <TypeIcon name={ticket.ticketType.name} />
                  {ticket.ticketType.name}
                </span>
              </DetailRow>
              <DetailRow label="Category">
                <Select
                  value={ticket.category?.id ?? ""}
                  onChange={(e) => updateTicketDetails({ categoryId: e.target.value || null })}
                  disabled={detailsSaving}
                  className="h-8 py-1"
                >
                  <option value="">Select category...</option>
                  {metadata.routingCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </DetailRow>
              <DetailRow label="Team">
                {ticket.team?.name ?? (
                  <span className="text-slate-500">None — set a category</span>
                )}
              </DetailRow>
              {ticket.resolutionDueAt && (
                <DetailRow label="Time to resolution">
                  <span className={slaAtRisk ? "font-medium text-[#c9372c]" : ""}>
                    {formatDate(ticket.resolutionDueAt)}
                  </span>
                </DetailRow>
              )}
              {ticket.asset && <DetailRow label="Asset">{ticket.asset.assetTag}</DetailRow>}
            </dl>
            {detailsError && (
              <p className="px-4 pb-3 text-xs text-[#c9372c]">{detailsError}</p>
            )}
          </div>

          {metadata.currentUserId && (
            <TicketWorkTimer
              ticketId={ticket.id}
              userId={metadata.currentUserId}
              status={ticket.status}
              onLogged={refreshTicket}
            />
          )}

          {relatedTickets.length > 0 && ticket.contact && (
            <div className="rounded-[4px] border border-slate-200">
              <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
                Other tickets from {ticket.contact.name}
              </h2>
              <ul className="py-1">
                {relatedTickets.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/app/tickets/${t.id}`}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100"
                    >
                      <PriorityIcon name={t.priority.name} />
                      <span className="shrink-0 text-sm text-slate-600">{t.ticketNumber}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-900">{t.subject}</span>
                      <SoftBadge color={t.status.color}>{t.status.name}</SoftBadge>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ticket.timeEntries && ticket.timeEntries.length > 0 && (
            <div className="rounded-[4px] border border-slate-200">
              <h2 className="flex items-baseline justify-between border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
                Time tracking
                <span className="text-sm font-normal text-slate-600">
                  {ticket.timeEntries.reduce((s, e) => s + e.durationMinutes, 0)}m logged
                </span>
              </h2>
              <ul className="max-h-48 space-y-2 overflow-y-auto px-4 py-3 text-sm text-slate-600">
                {ticket.timeEntries.slice(0, 8).map((e) => (
                  <li key={e.id} className="flex gap-2">
                    <Avatar name={e.user.name} size={20} />
                    <div className="min-w-0">
                      <span className="font-medium text-slate-900">{e.durationMinutes}m</span>
                      {" · "}
                      {e.user.name}
                      {e.notes && <p className="line-clamp-2 text-xs text-slate-500">{e.notes}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}        </div>
      </div>

      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091e427d]">
          <div className="w-full max-w-md rounded-[4px] bg-white p-6 shadow-overlay">
            <h3 className="text-xl font-medium text-slate-900">Resolve ticket</h3>
            <p className="mt-1 text-sm text-slate-500">Please provide a resolution summary.</p>
            <Textarea
              className="mt-4"
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              placeholder="Describe how the issue was resolved..."
            />
            <div className="mt-4 flex gap-2">
              <Button onClick={handleResolve} disabled={loading || !resolutionSummary.trim()}>
                Resolve
              </Button>
              <Button variant="secondary" onClick={() => setResolveModal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Jira field row: label on the left, value on the right. */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3 py-1.5">
      <dt className="text-sm font-semibold text-slate-600">{label}</dt>
      <dd className="min-w-0 text-sm text-slate-900">{children}</dd>
    </div>
  );
}
