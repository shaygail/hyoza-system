const STORAGE_PREFIX = "hyoza:work-timer:";

export type WorkTimerState = {
  ticketId: string;
  userId: string;
  startedAt: number;
};

export function isTicketOpenForWork(status: { category?: string | null; code: string }) {
  const category = status.category ?? "";
  if (category === "open" || category === "waiting") return true;
  return ["open", "in_progress", "waiting_customer", "waiting_vendor"].includes(status.code);
}

function storageKey(ticketId: string, userId: string) {
  return `${STORAGE_PREFIX}${ticketId}:${userId}`;
}

export function loadWorkTimer(ticketId: string, userId: string): WorkTimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(ticketId, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkTimerState;
    if (!parsed?.startedAt || parsed.ticketId !== ticketId || parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function startWorkTimer(ticketId: string, userId: string): WorkTimerState {
  const state: WorkTimerState = { ticketId, userId, startedAt: Date.now() };
  localStorage.setItem(storageKey(ticketId, userId), JSON.stringify(state));
  return state;
}

export function clearWorkTimer(ticketId: string, userId: string) {
  localStorage.removeItem(storageKey(ticketId, userId));
}

export function elapsedMs(startedAt: number, now = Date.now()) {
  return Math.max(0, now - startedAt);
}

export function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Bill at least 1 minute once 30s have elapsed; otherwise 0 (discard or round up in UI). */
export function billableMinutesFromElapsed(ms: number) {
  if (ms < 30_000) return 0;
  return Math.max(1, Math.round(ms / 60_000));
}
