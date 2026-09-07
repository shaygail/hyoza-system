"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface OrgRow {
  id: string;
  name: string;
  accountCode: string | null;
  status: string;
  _count: { contacts: number; tickets: number; contracts?: number };
}

export function CustomersListClient({
  organisations,
  canEdit,
}: {
  organisations: OrgRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [accountCode, setAccountCode] = useState("");
  const [error, setError] = useState("");

  async function createOrg() {
    if (!name.trim()) return;
    setError("");
    const res = await fetch("/api/v1/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, accountCode: accountCode || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to create");
      return;
    }
    router.push(`/app/customers/${data.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">CRM — Accounts</h1>
          <p className="text-sm text-slate-500">Organisation accounts and contacts.</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "New account"}
          </Button>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap gap-2">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Account name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Account code"
            value={accountCode}
            onChange={(e) => setAccountCode(e.target.value)}
          />
          <Button size="sm" onClick={createOrg}>Create</Button>
          {error && <p className="w-full text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Organisation</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Account Code</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Contacts</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Tickets</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {organisations.map((org) => (
              <tr key={org.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/app/customers/${org.id}`} className="font-medium text-ourcloud-600 hover:underline">
                    {org.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{org.accountCode ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{org._count.contacts}</td>
                <td className="px-4 py-3 text-slate-600">{org._count.tickets}</td>
                <td className="px-4 py-3 capitalize text-slate-600">{org.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
