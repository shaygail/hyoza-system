import { describe, expect, it } from "vitest";
import {
  buildInvoiceLines,
  buildInvoiceLinesByMonth,
  invoiceTotals,
  normaliseLine,
  periodLabelFor,
  type PricingContract,
  type PricingEntry,
} from "@/domain/invoice-lines";

const entry = (minutes: number, extra: Partial<PricingEntry> = {}): PricingEntry => ({
  durationMinutes: minutes,
  isBillable: true,
  status: "approved",
  workTypeId: null,
  ...extra,
});

const contract = (extra: Partial<PricingContract>): PricingContract => ({
  contractType: "block_hours",
  retainerAmount: null,
  monthlyMinutes: null,
  overageHourlyRate: null,
  ...extra,
});

describe("buildInvoiceLines", () => {
  it("bills block-hours overage beyond the allowance at the overage rate", () => {
    const lines = buildInvoiceLines(
      contract({ monthlyMinutes: 60, overageHourlyRate: 120 }),
      "Oct 2026",
      [entry(60), entry(30)]
    );
    expect(lines).toEqual([
      expect.objectContaining({ lineType: "overage", quantity: 0.5, unitAmount: 120, lineTotal: 60 }),
    ]);
  });

  it("shows included usage at $0 when within the block allowance", () => {
    const lines = buildInvoiceLines(contract({ monthlyMinutes: 600 }), "Oct 2026", [entry(90)]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ lineType: "included", lineTotal: 0 });
  });

  it("ignores unapproved and non-billable time", () => {
    const lines = buildInvoiceLines(contract({ monthlyMinutes: 0, overageHourlyRate: 100 }), "Oct 2026", [
      entry(60, { status: "submitted" }),
      entry(60, { isBillable: false }),
    ]);
    expect(lines[0]).toMatchObject({ lineType: "info", lineTotal: 0 });
  });

  it("prices time & materials per work type using the rate card", () => {
    const lines = buildInvoiceLines(
      contract({
        contractType: "tm",
        overageHourlyRate: 100,
        rateCard: { lines: [{ workTypeId: "onsite", hourlyRate: 180 }] },
      }),
      "Oct 2026",
      [
        entry(60, { workTypeId: "onsite", workType: { name: "Onsite" } }),
        entry(30, { workTypeId: "remote", workType: { name: "Remote" } }),
      ]
    );
    expect(lines).toEqual([
      expect.objectContaining({ description: "Time & materials — Onsite", lineTotal: 180 }),
      expect.objectContaining({ description: "Time & materials — Remote", lineTotal: 50 }),
    ]);
  });

  it("adds the retainer once, plus overage beyond the retainer hours", () => {
    const c = contract({ contractType: "retainer", retainerAmount: 2000, monthlyMinutes: 60, overageHourlyRate: 150 });
    const lines = buildInvoiceLines(c, "Oct 2026", [entry(120)]);
    expect(lines.map((l) => l.lineType)).toEqual(["retainer", "overage"]);
    expect(invoiceTotals(lines)).toEqual({ subtotal: 2150, taxAmount: 322.5, total: 2472.5 });
  });

  it("can leave the retainer out when it was already billed this month", () => {
    const c = contract({ contractType: "retainer", retainerAmount: 2000, monthlyMinutes: 600 });
    const lines = buildInvoiceLines(c, "Oct 2026", [entry(30)], { includeRetainer: false });
    expect(lines.some((l) => l.lineType === "retainer")).toBe(false);
  });
});

describe("buildInvoiceLinesByMonth", () => {
  it("applies the monthly allowance to each month separately", () => {
    const c = contract({ monthlyMinutes: 60, overageHourlyRate: 100 });
    const lines = buildInvoiceLinesByMonth(c, "Sep – Oct 2026", [
      { ...entry(90), createdAt: new Date(2026, 8, 10) }, // 30m over in Sep
      { ...entry(60), createdAt: new Date(2026, 9, 2) }, // within Oct allowance
    ]);
    expect(lines.map((l) => l.lineType)).toEqual(["overage", "included"]);
    expect(lines[0]).toMatchObject({ lineTotal: 50 });
    expect(lines[0].description).toMatch(/^Sep 2026: /);
  });

  it("adds the retainer charge once across several months", () => {
    const c = contract({ contractType: "retainer", retainerAmount: 1000, monthlyMinutes: 600 });
    const lines = buildInvoiceLinesByMonth(c, "Sep – Oct 2026", [
      { ...entry(30), createdAt: new Date(2026, 8, 10) },
      { ...entry(30), createdAt: new Date(2026, 9, 2) },
    ]);
    expect(lines.filter((l) => l.lineType === "retainer")).toHaveLength(1);
    expect(invoiceTotals(lines).subtotal).toBe(1000);
  });
});

describe("normaliseLine", () => {
  it("recomputes the line total from quantity and unit amount", () => {
    expect(normaliseLine({ description: " Discount ", quantity: "1", unitAmount: "-50" })).toEqual({
      description: "Discount",
      quantity: 1,
      unitAmount: -50,
      lineTotal: -50,
      lineType: "adjustment",
    });
  });

  it("rejects lines without a description or with bad numbers", () => {
    expect(() => normaliseLine({ description: "", quantity: 1, unitAmount: 1 })).toThrow();
    expect(() => normaliseLine({ description: "x", quantity: "abc", unitAmount: 1 })).toThrow();
  });
});

describe("periodLabelFor", () => {
  it("uses a month label within one month and a range otherwise", () => {
    expect(periodLabelFor(new Date(2026, 9, 1), new Date(2026, 9, 20))).toBe("Oct 2026");
    expect(periodLabelFor(new Date(2026, 8, 3), new Date(2026, 9, 20))).toContain("–");
  });
});
