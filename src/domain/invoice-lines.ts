/**
 * Pure invoice pricing rules shared by billing periods and the finance billing review.
 * No database access here so the rules can be unit tested.
 */

export const GST_RATE = 0.15;
export const DEFAULT_HOURLY_RATE = 150;

export interface PricingContract {
  contractType: string;
  retainerAmount: number | null;
  monthlyMinutes: number | null;
  overageHourlyRate: number | null;
  rateCard?: { lines: { workTypeId: string; hourlyRate: number }[] } | null;
}

export interface PricingEntry {
  durationMinutes: number;
  isBillable: boolean;
  status: string;
  workTypeId: string | null;
  workType?: { name: string } | null;
}

export interface DraftLine {
  description: string;
  quantity: number;
  unitAmount: number;
  lineTotal: number;
  lineType: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildInvoiceLines(
  contract: PricingContract,
  periodLabel: string,
  entries: PricingEntry[],
  options: { includeRetainer?: boolean } = {}
): DraftLine[] {
  const includeRetainer = options.includeRetainer ?? true;
  const lines: DraftLine[] = [];

  if (includeRetainer && contract.contractType === "retainer" && contract.retainerAmount != null) {
    lines.push({
      description: `Monthly retainer — ${periodLabel}`,
      quantity: 1,
      unitAmount: contract.retainerAmount,
      lineTotal: contract.retainerAmount,
      lineType: "retainer",
    });
  }

  const rateMap = new Map((contract.rateCard?.lines ?? []).map((l) => [l.workTypeId, l.hourlyRate]));
  const defaultRate = contract.overageHourlyRate ?? DEFAULT_HOURLY_RATE;

  const approvedBillable = entries.filter((e) => e.isBillable && e.status === "approved");
  const totalMinutes = approvedBillable.reduce((s, e) => s + e.durationMinutes, 0);

  if (contract.contractType === "block_hours") {
    const allowance = contract.monthlyMinutes ?? 0;
    const overageMinutes = Math.max(0, totalMinutes - allowance);
    if (overageMinutes > 0) {
      const hours = overageMinutes / 60;
      lines.push({
        description: `Block hours overage (${overageMinutes}m beyond ${allowance}m)`,
        quantity: round2(hours),
        unitAmount: defaultRate,
        lineTotal: round2(hours * defaultRate),
        lineType: "overage",
      });
    } else if (totalMinutes > 0) {
      lines.push({
        description: `Included block hours usage (${totalMinutes}m of ${allowance}m)`,
        quantity: 0,
        unitAmount: 0,
        lineTotal: 0,
        lineType: "included",
      });
    }
  } else if (contract.contractType === "tm") {
    const byType = new Map<string, { minutes: number; name: string; rate: number }>();
    for (const entry of approvedBillable) {
      const key = entry.workTypeId ?? "default";
      const rate = entry.workTypeId ? rateMap.get(entry.workTypeId) ?? defaultRate : defaultRate;
      const group = byType.get(key) ?? { minutes: 0, name: entry.workType?.name ?? "General", rate };
      group.minutes += entry.durationMinutes;
      byType.set(key, group);
    }
    for (const [, group] of byType) {
      const hours = group.minutes / 60;
      lines.push({
        description: `Time & materials — ${group.name}`,
        quantity: round2(hours),
        unitAmount: group.rate,
        lineTotal: round2(hours * group.rate),
        lineType: "time",
      });
    }
  } else if (contract.contractType === "retainer" && contract.monthlyMinutes != null) {
    const overageMinutes = Math.max(0, totalMinutes - contract.monthlyMinutes);
    if (overageMinutes > 0) {
      const hours = overageMinutes / 60;
      lines.push({
        description: `Retainer overage (${overageMinutes}m)`,
        quantity: round2(hours),
        unitAmount: defaultRate,
        lineTotal: round2(hours * defaultRate),
        lineType: "overage",
      });
    }
  }

  if (lines.length === 0) {
    lines.push({
      description: `No billable charges for ${periodLabel}`,
      quantity: 0,
      unitAmount: 0,
      lineTotal: 0,
      lineType: "info",
    });
  }

  return lines;
}

const monthLabel = (d: Date) => `${d.toLocaleString("en", { month: "short" })} ${d.getFullYear()}`;

/**
 * Allowances (block hours, retainer hours) reset every month, so time spanning several months
 * is priced month by month. Time & materials has no allowance and is priced as one batch.
 * The retainer charge itself is added at most once.
 */
export function buildInvoiceLinesByMonth(
  contract: PricingContract,
  periodLabel: string,
  entries: (PricingEntry & { createdAt: Date })[],
  options: { includeRetainer?: boolean; retainerLabel?: string } = {}
): DraftLine[] {
  const monthly = contract.contractType === "block_hours" || contract.contractType === "retainer";
  if (!monthly) return buildInvoiceLines(contract, periodLabel, entries, options);

  const byMonth = new Map<string, { label: string; entries: PricingEntry[] }>();
  for (const e of entries) {
    const key = `${e.createdAt.getFullYear()}-${String(e.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const bucket = byMonth.get(key) ?? { label: monthLabel(e.createdAt), entries: [] };
    bucket.entries.push(e);
    byMonth.set(key, bucket);
  }

  const lines: DraftLine[] = [];
  if (options.includeRetainer ?? true) {
    lines.push(
      ...buildInvoiceLines(contract, options.retainerLabel ?? periodLabel, [], { includeRetainer: true }).filter((l) => l.lineType === "retainer")
    );
  }
  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [, bucket] of months) {
    const monthLines = buildInvoiceLines(contract, bucket.label, bucket.entries, { includeRetainer: false })
      .filter((l) => l.lineType !== "info")
      .map((l) => (months.length > 1 ? { ...l, description: `${bucket.label}: ${l.description}` } : l));
    lines.push(...monthLines);
  }

  if (lines.length === 0) return buildInvoiceLines(contract, periodLabel, [], { includeRetainer: false });
  return lines;
}

export function invoiceTotals(lines: { lineTotal: number }[]) {
  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const taxAmount = round2(subtotal * GST_RATE);
  return { subtotal, taxAmount, total: round2(subtotal + taxAmount) };
}

/** Normalises a hand-edited invoice line (finance adjustments on drafts). */
export function normaliseLine(input: {
  description: unknown;
  quantity: unknown;
  unitAmount: unknown;
  lineType?: unknown;
}): DraftLine {
  const description = String(input.description ?? "").trim();
  const quantity = Number(input.quantity);
  const unitAmount = Number(input.unitAmount);
  if (!description) throw new Error("Each line needs a description");
  if (!Number.isFinite(quantity) || !Number.isFinite(unitAmount)) {
    throw new Error(`Line "${description}" has an invalid quantity or amount`);
  }
  return {
    description,
    quantity: round2(quantity),
    unitAmount: round2(unitAmount),
    lineTotal: round2(quantity * unitAmount),
    lineType: typeof input.lineType === "string" && input.lineType ? input.lineType : "adjustment",
  };
}

export function periodLabelFor(start: Date, end: Date) {
  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  if (sameMonth) return `${start.toLocaleString("en", { month: "short" })} ${start.getFullYear()}`;
  const fmt = (d: Date) => d.toLocaleString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}
