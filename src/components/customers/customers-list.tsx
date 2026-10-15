"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader
        title="Customers"
        description="Organisation accounts and their contacts."
        actions={
          canEdit && (
            <Button variant={showForm ? "secondary" : "default"} onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "Add customer"}
            </Button>
          )
        }
      />

      {showForm && (
        <div className="flex flex-wrap items-center gap-2 rounded-[4px] border border-slate-200 bg-slate-50 p-4">
          <Input
            className="w-64"
            placeholder="Account name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            className="w-48"
            placeholder="Account code"
            value={accountCode}
            onChange={(e) => setAccountCode(e.target.value)}
          />
          <Button onClick={createOrg}>Create</Button>
          {error && <p className="w-full text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-slate-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Organisation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Account Code</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Contacts</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Tickets</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {organisations.map((org) => (
              <tr key={org.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5">
                  <Link href={`/app/customers/${org.id}`} className="font-medium text-ourcloud-600 hover:underline">
                    {org.name}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-slate-600">{org.accountCode ?? "—"}</td>
                <td className="px-3 py-2.5 text-slate-600">{org._count.contacts}</td>
                <td className="px-3 py-2.5 text-slate-600">{org._count.tickets}</td>
                <td className="px-3 py-2.5 capitalize text-slate-600">{org.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
