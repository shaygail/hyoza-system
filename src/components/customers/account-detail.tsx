"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { ContactPortalAccess } from "@/components/customers/contact-portal-access";

type Tab = "overview" | "contacts" | "contracts" | "tickets" | "assets" | "billing" | "notes";

interface AccountData {
  id: string;
  name: string;
  accountCode: string | null;
  status: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  taxId: string | null;
  billingEmail: string | null;
  paymentTerms: string | null;
  xeroContactId: string | null;
  contacts: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    jobTitle: string | null;
    isPrimary: boolean;
    portalAccess: boolean;
    user?: { id: string } | null;
  }[];
  contracts: {
    id: string;
    name: string;
    contractType: string;
    status: string;
    monthlyMinutes: number | null;
  }[];
  assets: { id: string; assetTag: string; name: string }[];
  invoices: {
    id: string;
    invoiceNumber: string;
    status: string;
    total: number;
    currency: string;
  }[];
  tickets?: {
    id: string;
    ticketNumber: string;
    subject: string;
    updatedAt: string;
    status: { name: string; color: string };
    priority: { name: string; color: string };
  }[];
}

export function AccountDetailClient({
  account: initial,
  tickets,
  canEdit,
  usage,
}: {
  account: AccountData;
  tickets: AccountData["tickets"];
  canEdit: boolean;
  usage?: { usedMinutes: number; allowanceMinutes: number | null; remainingMinutes: number | null } | null;
}) {
  const router = useRouter();
  const [account, setAccount] = useState(initial);
  const [tab, setTab] = useState<Tab>("overview");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState({
    name: account.name,
    accountCode: account.accountCode ?? "",
    email: account.email ?? "",
    phone: account.phone ?? "",
    address: account.address ?? "",
    taxId: account.taxId ?? "",
    billingEmail: account.billingEmail ?? "",
    paymentTerms: account.paymentTerms ?? "",
    notes: account.notes ?? "",
  });
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", jobTitle: "" });

  async function saveAccount() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/v1/organisations/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: edit.name,
        accountCode: edit.accountCode || null,
        email: edit.email || null,
        phone: edit.phone || null,
        address: edit.address || null,
        taxId: edit.taxId || null,
        billingEmail: edit.billingEmail || null,
        paymentTerms: edit.paymentTerms || null,
        notes: edit.notes || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      return;
    }
    setAccount({ ...account, ...data });
    router.refresh();
  }

  async function addContact() {
    if (!contactForm.name || !contactForm.email) return;
    const res = await fetch(`/api/v1/organisations/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createContact", ...contactForm }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to add contact");
      return;
    }
    setContactForm({ name: "", email: "", phone: "", jobTitle: "" });
    router.refresh();
    const refreshed = await fetch(`/api/v1/organisations/${account.id}`);
    if (refreshed.ok) setAccount(await refreshed.json());
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "contacts", label: "Contacts" },
    { id: "contracts", label: "Contracts" },
    { id: "tickets", label: "Tickets" },
    { id: "assets", label: "Assets" },
    { id: "billing", label: "Billing" },
    { id: "notes", label: "Notes" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/customers" className="text-sm text-ourcloud-600 hover:underline">← CRM</Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{account.name}</h1>
        <p className="text-sm text-slate-500">
          {account.accountCode && `Account: ${account.accountCode} · `}
          {account.email} {account.phone && `· ${account.phone}`}
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === t.id ? "bg-ourcloud-50 text-ourcloud-700 font-medium" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {tab === "overview" && (
        <div className="space-y-4">
          {usage && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500">Used this month</p>
                <p className="text-xl font-semibold">{usage.usedMinutes}m</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Allowance</p>
                <p className="text-xl font-semibold">{usage.allowanceMinutes ?? "—"}{usage.allowanceMinutes != null ? "m" : ""}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Remaining</p>
                <p className="text-xl font-semibold">{usage.remainingMinutes ?? "—"}{usage.remainingMinutes != null ? "m" : ""}</p>
              </div>
            </div>
          )}
          {canEdit ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                {(["name", "accountCode", "email", "phone", "taxId", "billingEmail", "paymentTerms"] as const).map((field) => (
                  <input
                    key={field}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder={field}
                    value={edit[field]}
                    onChange={(e) => setEdit({ ...edit, [field]: e.target.value })}
                  />
                ))}
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                  placeholder="address"
                  value={edit.address}
                  onChange={(e) => setEdit({ ...edit, address: e.target.value })}
                />
              </div>
              <Button size="sm" onClick={saveAccount} disabled={saving}>Save account</Button>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 space-y-1">
              <p>Tax ID: {account.taxId ?? "—"}</p>
              <p>Billing email: {account.billingEmail ?? "—"}</p>
              <p>Payment terms: {account.paymentTerms ?? "—"}</p>
              <p>Xero contact: {account.xeroContactId ?? "—"}</p>
            </div>
          )}
        </div>
      )}

      {tab === "contacts" && (
        <div className="space-y-4">
          {canEdit && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap gap-2">
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Job title" value={contactForm.jobTitle} onChange={(e) => setContactForm({ ...contactForm, jobTitle: e.target.value })} />
              <Button size="sm" onClick={addContact}>Add contact</Button>
            </div>
          )}
          {account.contacts.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-medium">{c.name}{c.isPrimary ? " (Primary)" : ""}</p>
              <p className="text-sm text-slate-500">{c.email} {c.phone && `· ${c.phone}`}</p>
              {c.jobTitle && <p className="text-xs text-slate-400">{c.jobTitle}</p>}
              <div className="mt-2">
                <ContactPortalAccess
                  contactId={c.id}
                  contactName={c.name}
                  hasPortalUser={!!c.user}
                  portalAccess={c.portalAccess}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "contracts" && (
        <div className="space-y-3">
          {account.contracts.length === 0 ? (
            <p className="text-sm text-slate-500">No contracts. Create one under Admin → Contracts.</p>
          ) : (
            account.contracts.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 flex justify-between">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-slate-500">{c.contractType}{c.monthlyMinutes != null ? ` · ${c.monthlyMinutes}m/mo` : ""}</p>
                </div>
                <Badge color={c.status === "active" ? "#22c55e" : "#6b7280"}>{c.status}</Badge>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "tickets" && (
        <div className="rounded-xl border border-slate-200 bg-white divide-y">
          {(tickets ?? []).length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No tickets.</p>
          ) : (
            (tickets ?? []).map((t) => (
              <Link key={t.id} href={`/app/tickets/${t.id}`} className="block px-4 py-3 hover:bg-slate-50">
                <div className="flex gap-2 items-center">
                  <span className="font-mono text-xs text-slate-400">{t.ticketNumber}</span>
                  <Badge color={t.status.color}>{t.status.name}</Badge>
                </div>
                <p className="text-sm font-medium">{t.subject}</p>
                <p className="text-xs text-slate-400">{formatDate(t.updatedAt)}</p>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === "assets" && (
        <div className="rounded-xl border border-slate-200 bg-white divide-y">
          {account.assets.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No assets.</p>
          ) : (
            account.assets.map((a) => (
              <Link key={a.id} href={`/app/assets/${a.id}`} className="block px-4 py-3 hover:bg-slate-50">
                <span className="font-mono text-sm">{a.assetTag}</span> — {a.name}
              </Link>
            ))
          )}
        </div>
      )}

      {tab === "billing" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Billing email: {account.billingEmail ?? "—"} · Terms: {account.paymentTerms ?? "—"} · Xero: {account.xeroContactId ?? "—"}
          </p>
          {account.invoices.map((inv) => (
            <div key={inv.id} className="rounded-xl border border-slate-200 bg-white p-4 flex justify-between">
              <span className="font-mono">{inv.invoiceNumber}</span>
              <span>{inv.currency} {inv.total.toFixed(2)}</span>
              <Badge color="#f59e0b">{inv.status}</Badge>
            </div>
          ))}
        </div>
      )}

      {tab === "notes" && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          {canEdit ? (
            <>
              <Textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} placeholder="Account notes..." />
              <Button size="sm" onClick={saveAccount} disabled={saving}>Save notes</Button>
            </>
          ) : (
            <p className="text-sm whitespace-pre-wrap text-slate-700">{account.notes || "No notes."}</p>
          )}
        </div>
      )}
    </div>
  );
}
