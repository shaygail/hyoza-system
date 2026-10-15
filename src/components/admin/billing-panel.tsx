"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Period {
  id: string;
  label: string;
  status: string;
  startDate: string;
  endDate: string;
  organisation: { name: string };
  contract: { id: string; name: string; contractType: string };
  _count: { timeEntries: number; invoices: number };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  currency: string;
  organisation: { name: string };
  billingPeriod: { label: string } | null;
  lines: { description: string; quantity: number; unitAmount: number; lineTotal: number }[];
  xeroInvoiceId?: string | null;
}

interface Contract {
  id: string;
  name: string;
  organisation: { name: string };
}

export function BillingPanel() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [contractId, setContractId] = useState("");

  async function load() {
    setError("");
    const [pRes, iRes, cRes] = await Promise.all([
      fetch("/api/v1/billing?resource=periods"),
      fetch("/api/v1/billing?resource=invoices"),
      fetch("/api/v1/contracts"),
    ]);
    if (!pRes.ok) {
      setError("Unable to load billing (billing.view required)");
      return;
    }
    setPeriods(await pRes.json());
    if (iRes.ok) setInvoices(await iRes.json());
    if (cRes.ok) setContracts(await cRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function openPeriod() {
    if (!contractId) return;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const res = await fetch("/api/v1/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "openPeriod",
        contractId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to open period");
      return;
    }
    setMsg("Billing period opened");
    load();
  }

  async function closePeriod(periodId: string) {
    const res = await fetch("/api/v1/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "closePeriod", periodId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to close");
      return;
    }
    load();
  }

  async function generateInvoice(periodId: string) {
    const res = await fetch("/api/v1/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generateInvoice", periodId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to generate invoice");
      return;
    }
    setMsg(`Draft ${data.invoiceNumber} created`);
    load();
  }

  async function setInvoiceStatus(invoiceId: string, status: string) {
    const res = await fetch("/api/v1/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateInvoiceStatus", invoiceId, status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed");
      return;
    }
    load();
  }

  async function pushXero(invoiceId: string) {
    const res = await fetch("/api/v1/xero", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pushInvoice", invoiceId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Xero push failed");
      return;
    }
    setMsg(`Pushed to Xero as ${data.xeroInvoiceId}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Billing</h2>
        <p className="text-sm text-slate-500">Periods, invoice drafts, export, and Xero push.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-green-700">{msg}</p>}

      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Contract</label>
          <select
            className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400 min-w-[220px]"
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
          >
            <option value="">Select contract...</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.organisation.name}</option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={openPeriod}>Open current month period</Button>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium">Billing periods</h3>
        {periods.map((p) => (
          <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-medium">{p.label} — {p.organisation.name}</p>
                <p className="text-sm text-slate-500">{p.contract.name} · {p._count.timeEntries} time entries</p>
              </div>
              <Badge color={p.status === "open" ? "#3b82f6" : "#6b7280"}>{p.status}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.status === "open" && (
                <Button size="sm" variant="secondary" onClick={() => closePeriod(p.id)}>Close period</Button>
              )}
              <Button size="sm" onClick={() => generateInvoice(p.id)}>Generate invoice draft</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="font-medium">Invoices</h3>
        {invoices.length === 0 ? (
          <p className="text-sm text-slate-500">No invoices yet.</p>
        ) : (
          invoices.map((inv) => (
            <div key={inv.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium font-mono">{inv.invoiceNumber}</p>
                  <p className="text-sm text-slate-500">
                    {inv.organisation.name}
                    {inv.billingPeriod ? ` · ${inv.billingPeriod.label}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <Badge color={inv.status === "approved" ? "#22c55e" : inv.status === "void" ? "#ef4444" : "#f59e0b"}>
                    {inv.status}
                  </Badge>
                  <p className="mt-1 font-semibold">{inv.currency} {inv.total.toFixed(2)}</p>
                </div>
              </div>
              <ul className="mt-3 text-sm text-slate-600 space-y-1">
                {inv.lines.map((l, i) => (
                  <li key={i}>{l.description}: {l.lineTotal.toFixed(2)}</li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {inv.status === "draft" && (
                  <Button size="sm" onClick={() => setInvoiceStatus(inv.id, "approved")}>Approve</Button>
                )}
                {inv.status !== "void" && (
                  <Button size="sm" variant="ghost" onClick={() => setInvoiceStatus(inv.id, "void")}>Void</Button>
                )}
                <a
                  className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                  href={`/api/v1/billing?resource=invoice&id=${inv.id}&format=csv`}
                >
                  Export CSV
                </a>
                {inv.status === "approved" && (
                  <Button size="sm" variant="secondary" onClick={() => pushXero(inv.id)}>
                    {inv.xeroInvoiceId ? "Re-push Xero" : "Push to Xero"}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
