"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Play, Square, Timer } from "lucide-react";
import {
  billableMinutesFromElapsed,
  clearWorkTimer,
  elapsedMs,
  formatElapsed,
  isTicketOpenForWork,
  loadWorkTimer,
  startWorkTimer,
  type WorkTimerState,
} from "@/lib/work-timer";

export function TicketWorkTimer({
  ticketId,
  userId,
  status,
  onLogged,
}: {
  ticketId: string;
  userId: string;
  status: { category?: string | null; code: string; name: string };
  onLogged: () => Promise<void> | void;
}) {
  const ticketOpen = isTicketOpenForWork(status);
  const [timer, setTimer] = useState<WorkTimerState | null>(null);
  const [now, setNow] = useState(Date.now());
  const [stopping, setStopping] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTimer(loadWorkTimer(ticketId, userId));
  }, [ticketId, userId]);

  useEffect(() => {
    if (!timer || !ticketOpen) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timer, ticketOpen]);

  // Ticket left open-work states — force stop flow if a timer was running
  useEffect(() => {
    if (!ticketOpen && timer) {
      setStopping(true);
    }
  }, [ticketOpen, timer]);

  const running = Boolean(timer && ticketOpen && !stopping);
  const ms = timer ? elapsedMs(timer.startedAt, now) : 0;
  const minutes = billableMinutesFromElapsed(ms);

  function handleStart() {
    if (!ticketOpen) return;
    setError("");
    setStopping(false);
    setNotes("");
    setTimer(startWorkTimer(ticketId, userId));
    setNow(Date.now());
  }

  function handleStopClick() {
    if (!timer) return;
    setStopping(true);
    setError("");
  }

  function discardTimer() {
    clearWorkTimer(ticketId, userId);
    setTimer(null);
    setStopping(false);
    setNotes("");
    setError("");
  }

  async function saveTimer() {
    if (!timer) return;
    if (!notes.trim()) {
      setError("Notes are required to log time.");
      return;
    }
    const duration = billableMinutesFromElapsed(elapsedMs(timer.startedAt));
    if (duration < 1) {
      setError("Worked less than 30 seconds — discard or keep working.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const endedAt = new Date().toISOString();
      const res = await fetch("/api/v1/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          durationMinutes: duration,
          notes: notes.trim(),
          startedAt: new Date(timer.startedAt).toISOString(),
          endedAt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to log time");
        return;
      }
      clearWorkTimer(ticketId, userId);
      setTimer(null);
      setStopping(false);
      setNotes("");
      await onLogged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <Timer className="h-4 w-4 text-slate-500" />
        <h2 className="text-[13px] font-semibold text-slate-900">Work timer</h2>
      </div>

      {!ticketOpen ? (
        <p className="text-xs text-slate-500">
          Timer only runs while the ticket is open (current: {status.name}).
        </p>
      ) : (
        <p className="mb-3 text-xs text-slate-500">
          Start when you begin working on this ticket. Stop and add notes to log time.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <p className={`font-mono text-[28px] font-semibold tabular-nums leading-none ${running ? "text-ourcloud-700" : "text-slate-400"}`}>
          {formatElapsed(ms)}
        </p>
        {ticketOpen && !stopping && (
          <>
            {!timer ? (
              <Button variant="secondary" size="sm" onClick={handleStart}>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Start work
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={handleStopClick}>
                <Square className="mr-1.5 h-3.5 w-3.5" />
                Stop & log
              </Button>
            )}
          </>
        )}
        {running && <span className="text-xs font-medium text-green-600">Working…</span>}
      </div>

      {stopping && timer && (
        <div className="mt-3 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-800">
            {ticketOpen
              ? `Log ${minutes || "<1"} minute${minutes === 1 ? "" : "s"} with required notes.`
              : `Ticket is no longer open. Log ${minutes || "<1"} minute${minutes === 1 ? "" : "s"} with notes, or discard.`}
          </p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you work on?"
            className="min-h-[72px] text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={saveTimer} disabled={saving || !notes.trim() || minutes < 1}>
              Save time
            </Button>
            <Button variant="ghost" size="sm" onClick={discardTimer} disabled={saving}>
              Discard
            </Button>
            {ticketOpen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStopping(false);
                  setError("");
                }}
                disabled={saving}
              >
                Keep working
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
