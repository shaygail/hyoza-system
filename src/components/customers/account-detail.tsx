"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { Avatar, PriorityIcon } from "@/components/ui/jira";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title={account.name}
        breadcrumbs={[{ label: "Customers", href: "/app/customers" }]}
        description={
          <>
            {account.accountCode && `Account ${account.accountCode} · `}
            {account.email} {account.phone && `· ${account.phone}`}
          </>
        }
      />

      <div className="flex gap-1 overflow-x-auto border-b-2 border-slate-200 text-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-0.5 whitespace-nowrap border-b-2 px-2 pb-2 pt-1 font-medium transition-colors ${
              tab === t.id
                ? "border-ourcloud-600 text-ourcloud-700"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
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
                    className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400"
                    placeholder={field}
                    value={edit[field]}
                    onChange={(e) => setEdit({ ...edit, [field]: e.target.value })}
                  />
                ))}
                <input
                  className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400 md:col-span-2"
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
              <input className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400" placeholder="Name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
              <input className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400" placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
              <input className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400" placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
              <input className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400" placeholder="Job title" value={contactForm.jobTitle} onChange={(e) => setContactForm({ ...contactForm, jobTitle: e.target.value })} />
              <Button size="sm" onClick={addContact}>Add contact</Button>
            </div>
          )}
          {account.contacts.map((c) => (
            <div key={c.id} className="flex gap-3 rounded-[4px] border border-slate-200 p-4">
              <Avatar name={c.name} size={32} />
              <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-medium text-slate-900">
                {c.name}
                {c.isPrimary && <Badge color="#3b82f6">Primary</Badge>}
              </p>
              <p className="text-sm text-slate-600">{c.email} {c.phone && `· ${c.phone}`}</p>
              {c.jobTitle && <p className="text-xs text-slate-500">{c.jobTitle}</p>}
              <div className="mt-2">
                <ContactPortalAccess
                  contactId={c.id}
                  contactName={c.name}
                  hasPortalUser={!!c.user}
                  portalAccess={c.portalAccess}
                />
              </div>
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
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {(tickets ?? []).length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No tickets.</p>
          ) : (
            (tickets ?? []).map((t) => (
              <Link key={t.id} href={`/app/tickets/${t.id}`} className="flex h-10 items-center gap-3 px-2 hover:bg-slate-100">
                <PriorityIcon name={t.priority.name} />
                <span className="w-24 shrink-0 text-sm text-ourcloud-700">{t.ticketNumber}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-900">{t.subject}</span>
                <Badge color={t.status.color}>{t.status.name}</Badge>
                <span className="hidden w-36 shrink-0 text-right text-xs text-slate-500 md:block">{formatDate(t.updatedAt)}</span>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === "assets" && (
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {account.assets.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No assets.</p>
          ) : (
            account.assets.map((a) => (
              <Link key={a.id} href={`/app/assets/${a.id}`} className="flex h-10 items-center gap-3 px-2 text-sm hover:bg-slate-100">
                <span className="w-28 shrink-0 text-ourcloud-700">{a.assetTag}</span>
                <span className="text-slate-900">{a.name}</span>
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
