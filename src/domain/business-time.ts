/**
 * Timezone-aware business-hours arithmetic.
 *
 * All calendar rules (work days, start/end time, holidays) are interpreted as
 * wall-clock time in the calendar's IANA timezone, independent of the server's
 * own timezone. Pure functions only — no database access — so this is unit-testable.
 */

export interface BusinessCalendarConfig {
  timezone: string;
  /** 0 = Sunday … 6 = Saturday, in the calendar's timezone */
  workDays: number[];
  /** "HH:mm" local time */
  startTime: string;
  /** "HH:mm" local time */
  endTime: string;
  /** "YYYY-MM-DD" local dates */
  holidays: string[];
}

export function parseCalendar(raw: {
  timezone: string;
  workDays: string;
  startTime: string;
  endTime: string;
  holidays: string;
}): BusinessCalendarConfig {
  return {
    timezone: raw.timezone || "UTC",
    workDays: safeJsonArray<number>(raw.workDays, [1, 2, 3, 4, 5]),
    startTime: raw.startTime,
    endTime: raw.endTime,
    holidays: safeJsonArray<string>(raw.holidays, []),
  };
}

function safeJsonArray<T>(value: string, fallback: T[]): T[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function formatterFor(timezone: string) {
  let fmt = formatterCache.get(timezone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "short",
    });
    formatterCache.set(timezone, fmt);
  }
  return fmt;
}

export function localParts(date: Date, timezone: string): LocalParts {
  const parts: Record<string, string> = {};
  for (const p of formatterFor(timezone).formatToParts(date)) parts[p.type] = p.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAYS[parts.weekday] ?? 0,
  };
}

/** Offset (ms) of `timezone` from UTC at the given instant. */
function tzOffsetMs(date: Date, timezone: string): number {
  const p = localParts(date, timezone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Convert a local wall-clock time in `timezone` to a UTC instant. */
export function zonedTimeToDate(
  year: number,
  month: number,
  day: number,
  minuteOfDay: number,
  timezone: string
): Date {
  const naive = Date.UTC(year, month - 1, day, 0, minuteOfDay);
  let result = naive - tzOffsetMs(new Date(naive), timezone);
  // Re-check once: the offset may differ at the corrected instant (DST edges).
  const offset2 = tzOffsetMs(new Date(result), timezone);
  result = naive - offset2;
  return new Date(result);
}

function dayKey(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

interface BusinessDay {
  start: Date;
  end: Date;
  isOpen: boolean;
}

function businessDayFor(y: number, m: number, d: number, cal: BusinessCalendarConfig): BusinessDay {
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const isOpen = cal.workDays.includes(weekday) && !cal.holidays.includes(dayKey(y, m, d));
  return {
    start: zonedTimeToDate(y, m, d, parseTime(cal.startTime), cal.timezone),
    end: zonedTimeToDate(y, m, d, parseTime(cal.endTime), cal.timezone),
    isOpen,
  };
}

function nextLocalDay(y: number, m: number, d: number) {
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return { y: next.getUTCFullYear(), m: next.getUTCMonth() + 1, d: next.getUTCDate() };
}

const MAX_DAYS = 3660; // ~10 years: guards against calendars with no work days

/** Add `minutes` of business time to `start`, honouring the calendar's timezone. */
export function addBusinessMinutes(start: Date, minutes: number, cal: BusinessCalendarConfig): Date {
  if (minutes <= 0) return new Date(start);
  let remaining = minutes * 60000;
  let cursor = start.getTime();
  const p = localParts(start, cal.timezone);
  let day = { y: p.year, m: p.month, d: p.day };

  for (let i = 0; i < MAX_DAYS; i++) {
    const bd = businessDayFor(day.y, day.m, day.d, cal);
    if (bd.isOpen) {
      const from = Math.max(cursor, bd.start.getTime());
      const to = bd.end.getTime();
      if (from < to) {
        const available = to - from;
        if (remaining <= available) return new Date(from + remaining);
        remaining -= available;
      }
    }
    day = nextLocalDay(day.y, day.m, day.d);
    cursor = zonedTimeToDate(day.y, day.m, day.d, 0, cal.timezone).getTime();
  }
  // Calendar has no business time at all: fall back to wall-clock.
  return new Date(start.getTime() + minutes * 60000);
}

/** Business minutes elapsed between two instants (0 if `to` <= `from`). */
export function businessMinutesBetween(from: Date, to: Date, cal: BusinessCalendarConfig): number {
  if (to <= from) return 0;
  let total = 0;
  const p = localParts(from, cal.timezone);
  let day = { y: p.year, m: p.month, d: p.day };

  for (let i = 0; i < MAX_DAYS; i++) {
    const bd = businessDayFor(day.y, day.m, day.d, cal);
    if (bd.start.getTime() >= to.getTime()) break;
    if (bd.isOpen) {
      const a = Math.max(from.getTime(), bd.start.getTime());
      const b = Math.min(to.getTime(), bd.end.getTime());
      if (b > a) total += b - a;
    }
    day = nextLocalDay(day.y, day.m, day.d);
  }
  return Math.floor(total / 60000);
}

export function isWithinBusinessHours(date: Date, cal: BusinessCalendarConfig): boolean {
  const p = localParts(date, cal.timezone);
  const bd = businessDayFor(p.year, p.month, p.day, cal);
  return bd.isOpen && date >= bd.start && date < bd.end;
}
