"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, CircleCheck, Download, Pencil, Plus, Send, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { contractTypeLabel, formatDay, formatMinutes, formatMoney, invoiceStatusColor } from "@/components/finance/format";

interface Line {
  description: string;
  quantity: number;
  unitAmount: number;
  lineTotal: number;
  lineType: string;
}

interface InvoiceView {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  xeroInvoiceId: string | null;
  createdAt: string;
  issuedAt: string | null;
  organisation: { id: string; name: string; billingEmail: string | null; paymentTerms: string | null; xeroContactId: string | null };
  contract: { id: string; name: string; contractType: string } | null;
  periodLabel: string | null;
  lines: Line[];
  timeEntries: {
    id: string;
    createdAt: string;
    durationMinutes: number;
    isBillable: boolean;
    technician: string;
    workType: string | null;
    ticket: { id: string; ticketNumber: string; subject: string };
  }[];
}

type EditLine = { description: string; quantity: string; unitAmount: string; lineType: string };

export function InvoiceDetailClient({
  invoice,
  canEdit,
  xeroConnected,
}: {
  invoice: InvoiceView;
  canEdit: boolean;
  xeroConnected: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [lines, setLines] = useState<EditLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isDraft = invoice.status === "draft";

  async function post(url: string, body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return false;
    }
    router.refresh();
    return true;
  }

  function startEditing() {
    setLines(
      invoice.lines.map((l) => ({
        description: l.description,
        quantity: String(l.quantity),
        unitAmount: String(l.unitAmount),
        lineType: l.lineType,
      }))
    );
    setEditing(true);
  }

  async function saveLines() {
    if (await post("/api/v1/finance", { action: "updateLines", invoiceId: invoice.id, lines })) setEditing(false);
  }

  const setStatus = (status: "approved" | "void" | "draft") =>
    post("/api/v1/finance", { action: "setStatus", invoiceId: invoice.id, status });

  const editTotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitAmount) || 0), 0);
  const money = (n: number) => formatMoney(n, invoice.currency);
  const billableMinutes = invoice.timeEntries.filter((e) => e.isBillable).reduce((s, e) => s + e.durationMinutes, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        projectCrumbs={false}
        breadcrumbs={[
          { label: "Finance", href: "/app/finance" },
          { label: "Invoices", href: "/app/finance/invoices" },
        ]}
        title={
          <span className="flex items-center gap-3">
            {invoice.invoiceNumber}
            <Badge color={invoiceStatusColor[invoice.status]}>{invoice.status}</Badge>
            {invoice.xeroInvoiceId && <Badge color="#3b82f6">Sent to Xero</Badge>}
          </span>
        }
        actions={
          <>
            <a href={`/api/v1/billing?resource=invoice&id=${invoice.id}&format=csv`}>
              <Button variant="secondary">
                <Download className="mr-1.5 h-4 w-4" />
                CSV
              </Button>
            </a>
            {canEdit && isDraft && !editing && (
              <>
                <Button variant="secondary" onClick={startEditing}>
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Edit lines
                </Button>
                <Button onClick={() => setStatus("approved")} disabled={busy}>
                  <CircleCheck className="mr-1.5 h-4 w-4" />
                  Approve
                </Button>
              </>
            )}
            {canEdit && invoice.status === "approved" && !invoice.xeroInvoiceId && (
              <Button
                onClick={() => post("/api/v1/xero", { action: "pushInvoice", invoiceId: invoice.id })}
                disabled={busy || !xeroConnected}
                title={xeroConnected ? undefined : "Connect Xero in Project settings → Xero first"}
              >
                <Send className="mr-1.5 h-4 w-4" />
                Send to Xero
              </Button>
            )}
            {canEdit && invoice.status !== "void" && !editing && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm(`Void ${invoice.invoiceNumber}? Its time goes back to the billing review.`)) void setStatus("void");
                }}
                disabled={busy}
              >
                <Ban className="mr-1.5 h-4 w-4" />
                Void
              </Button>
            )}
          </>
        }
      />

      {error && <p className="rounded-[3px] bg-[#ffecec] px-3 py-2 text-sm text-[#ae2e24]">{error}</p>}
      {canEdit && invoice.status === "approved" && !invoice.xeroInvoiceId && !xeroConnected && (
        <p className="rounded-[3px] bg-[#fff7d6] px-3 py-2 text-sm text-[#7f5f01]">
          Xero isn&apos;t connected yet. Download the CSV, or connect Xero under Project settings → Xero.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-[4px] border border-slate-200">
            <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Line items</h2>
            {editing ? (
              <div className="space-y-2 p-4">
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[minmax(0,1fr)_90px_120px_36px] items-center gap-2">
                    <Input
                      value={l.description}
                      onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                      placeholder="Description"
                    />
                    <Input
                      value={l.quantity}
                      inputMode="decimal"
                      onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
                      aria-label="Quantity"
                    />
                    <Input
                      value={l.unitAmount}
                      inputMode="decimal"
                      onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, unitAmount: e.target.value } : x)))}
                      aria-label="Unit amount"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLines(lines.filter((_, j) => j !== i))}
                      aria-label="Remove line"
                      disabled={lines.length === 1}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setLines([...lines, { description: "", quantity: "1", unitAmount: "0", lineType: "adjustment" }])
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add line (use a negative amount for a discount)
                </Button>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-sm text-slate-600">
                    New subtotal <span className="font-semibold text-slate-900">{money(editTotal)}</span> + GST
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={saveLines} disabled={busy}>
                      Save lines
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-left text-xs font-semibold text-slate-500">
                    <th className="px-4 py-2">Description</th>
                    <th className="w-20 px-2 py-2 text-right">Qty</th>
                    <th className="w-28 px-2 py-2 text-right">Unit</th>
                    <th className="w-32 px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((l, i) => (
                    <tr key={i} className="border-b border-slate-200">
                      <td className="px-4 py-2 text-slate-900">{l.description}</td>
                      <td className="px-2 py-2 text-right text-slate-600">{l.quantity}</td>
                      <td className="px-2 py-2 text-right text-slate-600">{money(l.unitAmount)}</td>
                      <td className="px-4 py-2 text-right font-medium text-slate-900">{money(l.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="text-sm">
                  <tr>
                    <td colSpan={3} className="px-4 pt-3 text-right text-slate-600">Subtotal</td>
                    <td className="px-4 pt-3 text-right text-slate-900">{money(invoice.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 text-right text-slate-600">GST (15%)</td>
                    <td className="px-4 text-right text-slate-900">{money(invoice.taxAmount)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 pb-3 text-right font-semibold text-slate-900">Total</td>
                    <td className="px-4 pb-3 text-right text-base font-semibold text-slate-900">{money(invoice.total)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </section>

          <section className="rounded-[4px] border border-slate-200">
            <h2 className="flex items-baseline justify-between border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
              Time included
              <span className="font-normal text-slate-600">{formatMinutes(billableMinutes)} billable</span>
            </h2>
            {invoice.timeEntries.length === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-500">No time entries — this invoice is a recurring charge.</p>
            ) : (
              <div className="divide-y divide-slate-200">
                {invoice.timeEntries.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                    <span className="w-24 shrink-0 text-slate-600">{formatDay(e.createdAt)}</span>
                    <Link href={`/app/tickets/${e.ticket.id}`} className="w-24 shrink-0 text-ourcloud-700 hover:underline">
                      {e.ticket.ticketNumber}
                    </Link>
                    <span className="min-w-0 flex-1 truncate text-slate-900">{e.ticket.subject}</span>
                    <span className="hidden w-32 shrink-0 truncate text-slate-600 md:block">{e.technician}</span>
                    <span className="w-16 shrink-0 text-right font-medium text-slate-900">
                      {formatMinutes(e.durationMinutes)}
                    </span>
                    {!e.isBillable && <Badge color="#6b7280">Written off</Badge>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[4px] border border-slate-200">
            <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Details</h2>
            <dl className="space-y-1 px-4 py-3 text-sm">
              <Row label="Account">
                <Link href={`/app/customers/${invoice.organisation.id}`} className="text-ourcloud-700 hover:underline">
                  {invoice.organisation.name}
                </Link>
              </Row>
              <Row label="Contract">
                {invoice.contract
                  ? `${invoice.contract.name} (${contractTypeLabel[invoice.contract.contractType] ?? invoice.contract.contractType})`
                  : "—"}
              </Row>
              <Row label="Period">{invoice.periodLabel ?? "—"}</Row>
              <Row label="Created">{formatDay(invoice.createdAt)}</Row>
              <Row label="Approved">{invoice.issuedAt ? formatDay(invoice.issuedAt) : "—"}</Row>
              <Row label="Billing email">{invoice.organisation.billingEmail ?? "—"}</Row>
              <Row label="Terms">{invoice.organisation.paymentTerms ?? "—"}</Row>
              <Row label="Xero contact">{invoice.organisation.xeroContactId ?? "Mapped on first send"}</Row>
            </dl>
          </section>
          {invoice.notes && <p className="px-1 text-xs text-slate-500">{invoice.notes}</p>}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 py-1">
      <dt className="font-semibold text-slate-600">{label}</dt>
      <dd className="min-w-0 break-words text-slate-900">{children}</dd>
    </div>
  );
}
