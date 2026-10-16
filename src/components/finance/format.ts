export function formatMoney(amount: number, currency = "NZD") {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
}

export function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatDay(iso: string | Date) {
  return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

export const contractTypeLabel: Record<string, string> = {
  block_hours: "Block hours",
  retainer: "Retainer",
  tm: "Time & materials",
};

export const invoiceStatusColor: Record<string, string> = {
  draft: "#6b7280",
  approved: "#22c55e",
  void: "#ef4444",
};
