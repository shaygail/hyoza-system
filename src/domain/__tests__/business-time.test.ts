import { describe, expect, it } from "vitest";
import {
  addBusinessMinutes,
  businessMinutesBetween,
  isWithinBusinessHours,
  type BusinessCalendarConfig,
} from "@/domain/business-time";

const auckland: BusinessCalendarConfig = {
  timezone: "Pacific/Auckland",
  workDays: [1, 2, 3, 4, 5],
  startTime: "09:00",
  endTime: "17:30",
  holidays: ["2026-10-26"], // Labour Day (Monday)
};

const london: BusinessCalendarConfig = { ...auckland, timezone: "Europe/London", holidays: [] };

const iso = (d: Date) => d.toISOString();

describe("addBusinessMinutes", () => {
  it("rolls over the weekend in the calendar's timezone", () => {
    // Fri 16 Oct 2026 16:30 NZDT (UTC+13)
    const start = new Date("2026-10-16T03:30:00Z");
    // 60 min Friday + 60 min Monday → Mon 19 Oct 10:00 NZDT
    expect(iso(addBusinessMinutes(start, 120, auckland))).toBe("2026-10-18T21:00:00.000Z");
  });

  it("treats a local Monday morning as a work day even though it is Sunday in UTC", () => {
    // Mon 19 Oct 09:30 NZDT == Sun 18 Oct 20:30 UTC
    const start = new Date("2026-10-18T20:30:00Z");
    expect(isWithinBusinessHours(start, auckland)).toBe(true);
    expect(iso(addBusinessMinutes(start, 30, auckland))).toBe("2026-10-18T21:00:00.000Z");
  });

  it("starts the clock at opening time when created before hours", () => {
    // Mon 19 Oct 07:00 NZDT
    const start = new Date("2026-10-18T18:00:00Z");
    expect(iso(addBusinessMinutes(start, 30, auckland))).toBe("2026-10-18T20:30:00.000Z");
  });

  it("skips holidays using the local date", () => {
    // Fri 23 Oct 17:00 NZDT; Mon 26 is Labour Day → resume Tue 27 09:00
    const start = new Date("2026-10-23T04:00:00Z");
    expect(iso(addBusinessMinutes(start, 60, auckland))).toBe("2026-10-26T20:30:00.000Z");
  });

  it("handles a DST change between business days", () => {
    // Fri 23 Oct 17:00 BST (UTC+1); clocks go back Sun 25 Oct → Mon is GMT
    const start = new Date("2026-10-23T16:00:00Z");
    expect(iso(addBusinessMinutes(start, 60, london))).toBe("2026-10-26T09:30:00.000Z");
  });

  it("falls back to wall-clock time when the calendar has no work days", () => {
    const start = new Date("2026-10-16T00:00:00Z");
    const closed = { ...auckland, workDays: [] };
    expect(iso(addBusinessMinutes(start, 90, closed))).toBe("2026-10-16T01:30:00.000Z");
  });

  it("returns the start time for non-positive durations", () => {
    const start = new Date("2026-10-16T03:30:00Z");
    expect(iso(addBusinessMinutes(start, 0, auckland))).toBe(iso(start));
  });
});

describe("businessMinutesBetween", () => {
  it("counts only business time across a weekend", () => {
    const from = new Date("2026-10-16T03:30:00Z"); // Fri 16:30 NZDT
    const to = new Date("2026-10-18T21:00:00Z"); // Mon 10:00 NZDT
    expect(businessMinutesBetween(from, to, auckland)).toBe(120);
  });

  it("is the inverse of addBusinessMinutes", () => {
    const from = new Date("2026-10-20T01:17:00Z");
    for (const mins of [1, 45, 510, 1234, 5000]) {
      const to = addBusinessMinutes(from, mins, auckland);
      expect(businessMinutesBetween(from, to, auckland)).toBe(mins);
    }
  });

  it("returns 0 when the range is outside business hours", () => {
    const from = new Date("2026-10-17T00:00:00Z"); // Sat
    const to = new Date("2026-10-17T10:00:00Z"); // Sat
    expect(businessMinutesBetween(from, to, auckland)).toBe(0);
  });
});
