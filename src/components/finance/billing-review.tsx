"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, CircleAlert, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { contractTypeLabel, formatDay, formatMinutes, formatMoney } from "@/components/finance/format";

interface ReviewEntry {
  id: string;
  createdAt: string;
  durationMinutes: number;
  notes: string | null;
  technician: string;
  workType: string | null;
  ticket: { id: string; ticketNumber: string; subject: string };
}

interface ReviewGroup {
  key: string;
  organisation: { id: string; name: string };
  contract: { id: string; name: string; contractType: string; currency: string; monthlyMinutes: number | null } | null;
  label: string;
  minutes: number;
  retainerDue: boolean;
  estimate: number;
  lines: { description: string; quantity: number; unitAmount: number; lineTotal: number; lineType: string }[];
  entries: ReviewEntry[];
}

export function BillingReviewClient({
  groups,
  awaitingApproval,
  canEdit,
}: {
  groups: ReviewGroup[];
  awaitingApproval: { count: number; minutes: number };
  canEdit: boolean;
}) {
  const totalValue = groups.reduce((s, g) => s + g.estimate, 0);
  const totalMinutes = groups.reduce((s, g) => s + g.minutes, 0);
  const currency = groups.find((g) => g.contract)?.contract?.currency ?? "NZD";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ready to bill (est., excl. GST)" value={formatMoney(totalValue, currency)} />
        <Stat label="Accounts" value={String(groups.length)} />
        <Stat label="Unbilled billable time" value={formatMinutes(totalMinutes)} />
        <Stat
          label="Awaiting approval"
          value={`${awaitingApproval.count} · ${formatMinutes(awaitingApproval.minutes)}`}
          hint="Approved by service leads in Time tracking"
        />
      </div>

      {groups.length === 0 ? (
        <div className="rounded-[4px] border border-slate-200 p-12 text-center">
          <Receipt className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 font-medium text-slate-900">Nothing waiting to be billed</p>
          <p className="text-sm text-slate-500">Approved billable time and due retainers will show up here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <ReviewCard key={g.key} group={g} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[4px] border border-slate-200 p-4">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-medium text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function ReviewCard({ group, canEdit }: { group: ReviewGroup; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const currency = group.contract?.currency ?? "NZD";

  async function createInvoice() {
    if (!group.contract) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/v1/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createInvoice", contractId: group.contract.id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create the invoice");
      return;
    }
    router.push(`/app/finance/invoices/${data.id}`);
  }

  return (
    <section className="rounded-[4px] border border-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/app/customers/${group.organisation.id}`} className="font-semibold text-slate-900 hover:underline">
              {group.organisation.name}
            </Link>
            {group.contract ? (
              <Badge color="#3b82f6">{contractTypeLabel[group.contract.contractType] ?? group.contract.contractType}</Badge>
            ) : (
              <Badge color="#ef4444">No contract</Badge>
            )}
            {group.retainerDue && <Badge color="#f59e0b">Retainer due</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-slate-600">
            {group.contract?.name ?? "Time logged without a contract"} · {group.label} ·{" "}
            {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"}, {formatMinutes(group.minutes)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-500">Estimate</p>
            <p className="text-lg font-medium text-slate-900">
              {group.contract ? formatMoney(group.estimate, currency) : "—"}
            </p>
          </div>
          {canEdit && group.contract && (
            <Button onClick={createInvoice} disabled={busy}>
              {busy ? "Creating…" : "Create draft invoice"}
            </Button>
          )}
        </div>
      </div>

      {!group.contract && (
        <p className="mx-4 mb-3 flex items-center gap-2 rounded-[3px] bg-[#fff7d6] px-3 py-2 text-sm text-[#7f5f01]">
          <CircleAlert className="h-4 w-4 shrink-0" />
          This time isn&apos;t linked to a contract, so it can&apos;t be priced. Ask a manager to add a contract for this
          account, or write the time off.
        </p>
      )}
      {error && <p className="mx-4 mb-3 text-sm text-[#c9372c]">{error}</p>}

      {group.lines.length > 0 && (
        <table className="mx-4 mb-3 w-[calc(100%-2rem)] text-sm">
          <tbody>
            {group.lines.map((l, i) => (
              <tr key={i} className="border-t border-slate-200">
                <td className="py-1.5 text-slate-900">{l.description}</td>
                <td className="w-24 py-1.5 text-right text-slate-600">{l.quantity}</td>
                <td className="w-28 py-1.5 text-right text-slate-600">{formatMoney(l.unitAmount, currency)}</td>
                <td className="w-28 py-1.5 text-right font-medium text-slate-900">{formatMoney(l.lineTotal, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {group.entries.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center gap-1.5 border-t border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {open ? "Hide" : "Show"} time entries
          </button>
          {open && (
            <div className="overflow-x-auto border-t border-slate-200">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-left text-xs font-semibold text-slate-500">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-2 py-2">Ticket</th>
                    <th className="px-2 py-2">Technician</th>
                    <th className="px-2 py-2">Work type</th>
                    <th className="px-2 py-2 text-right">Time</th>
                    <th className="px-2 py-2">Notes</th>
                    {canEdit && <th className="px-4 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {group.entries.map((e) => (
                    <EntryRow key={e.id} entry={e} canEdit={canEdit} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function EntryRow({ entry, canEdit }: { entry: ReviewEntry; canEdit: boolean }) {
  const router = useRouter();
  const [writingOff, setWritingOff] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function writeOff() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/v1/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "writeOff", entryId: entry.id, reason }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not write off this entry");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <tr className="border-b border-slate-200 align-top hover:bg-slate-50">
        <td className="whitespace-nowrap px-4 py-2 text-slate-600">{formatDay(entry.createdAt)}</td>
        <td className="px-2 py-2">
          <Link href={`/app/tickets/${entry.ticket.id}`} className="text-ourcloud-700 hover:underline">
            {entry.ticket.ticketNumber}
          </Link>
          <p className="max-w-[260px] truncate text-xs text-slate-500">{entry.ticket.subject}</p>
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-slate-900">{entry.technician}</td>
        <td className="whitespace-nowrap px-2 py-2 text-slate-600">{entry.workType ?? "—"}</td>
        <td className="whitespace-nowrap px-2 py-2 text-right font-medium text-slate-900">
          {formatMinutes(entry.durationMinutes)}
        </td>
        <td className="max-w-[280px] px-2 py-2 text-slate-600">{entry.notes ?? "—"}</td>
        {canEdit && (
          <td className="whitespace-nowrap px-4 py-2 text-right">
            {!writingOff && (
              <Button variant="ghost" size="sm" onClick={() => setWritingOff(true)}>
                Write off
              </Button>
            )}
          </td>
        )}
      </tr>
      {writingOff && (
        <tr className="border-b border-slate-200 bg-slate-50">
          <td colSpan={7} className="px-4 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (e.g. goodwill, duplicate entry, warranty work)"
                className="max-w-md"
              />
              <Button variant="danger" size="sm" onClick={writeOff} disabled={busy || !reason.trim()}>
                Write off {formatMinutes(entry.durationMinutes)}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setWritingOff(false)}>
                Cancel
              </Button>
              {error && <span className="text-sm text-[#c9372c]">{error}</span>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
