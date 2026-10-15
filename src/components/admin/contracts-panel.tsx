"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Org {
  id: string;
  name: string;
}

interface Contract {
  id: string;
  name: string;
  contractType: string;
  status: string;
  currency: string;
  monthlyMinutes: number | null;
  retainerAmount: number | null;
  overageHourlyRate: number | null;
  organisation: { id: string; name: string };
}

export function ContractsPanel() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    organisationId: "",
    name: "",
    contractType: "block_hours",
    monthlyMinutes: "600",
    retainerAmount: "",
    overageHourlyRate: "150",
    status: "active",
  });

  async function load() {
    setError("");
    const [cRes, oRes] = await Promise.all([
      fetch("/api/v1/contracts"),
      fetch("/api/v1/organisations"),
    ]);
    if (!cRes.ok) {
      setError("Unable to load contracts (contracts.view required)");
      return;
    }
    setContracts(await cRes.json());
    if (oRes.ok) setOrgs(await oRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function createContract() {
    if (!form.organisationId || !form.name) return;
    setMsg("");
    const res = await fetch("/api/v1/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organisationId: form.organisationId,
        name: form.name,
        contractType: form.contractType,
        status: form.status,
        monthlyMinutes: form.monthlyMinutes ? Number(form.monthlyMinutes) : undefined,
        retainerAmount: form.retainerAmount ? Number(form.retainerAmount) : undefined,
        overageHourlyRate: form.overageHourlyRate ? Number(form.overageHourlyRate) : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to create contract");
      return;
    }
    setMsg("Contract created");
    setForm({ ...form, name: "" });
    load();
  }

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/v1/contracts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update");
      return;
    }
    load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Contracts</h2>
        <p className="text-sm text-slate-500">Block hours, retainers, and time & materials agreements.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-green-700">{msg}</p>}

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h3 className="text-sm font-medium text-slate-700">New contract</h3>
        <div className="grid gap-2 md:grid-cols-3">
          <select
            className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400"
            value={form.organisationId}
            onChange={(e) => setForm({ ...form, organisationId: e.target.value })}
          >
            <option value="">Account...</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <input
            className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400"
            placeholder="Contract name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400"
            value={form.contractType}
            onChange={(e) => setForm({ ...form, contractType: e.target.value })}
          >
            <option value="block_hours">Block hours</option>
            <option value="retainer">Monthly retainer</option>
            <option value="tm">Time & materials</option>
          </select>
          <input
            className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400"
            placeholder="Monthly minutes"
            value={form.monthlyMinutes}
            onChange={(e) => setForm({ ...form, monthlyMinutes: e.target.value })}
          />
          <input
            className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400"
            placeholder="Retainer amount"
            value={form.retainerAmount}
            onChange={(e) => setForm({ ...form, retainerAmount: e.target.value })}
          />
          <input
            className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400"
            placeholder="Overage hourly rate"
            value={form.overageHourlyRate}
            onChange={(e) => setForm({ ...form, overageHourlyRate: e.target.value })}
          />
        </div>
        <Button size="sm" onClick={createContract}>Create contract</Button>
      </div>

      <div className="space-y-3">
        {contracts.length === 0 ? (
          <p className="text-slate-500 text-sm">No contracts yet.</p>
        ) : (
          contracts.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-slate-500">{c.organisation.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={c.status === "active" ? "#22c55e" : "#6b7280"}>{c.status}</Badge>
                  <Badge color="#3b82f6">{c.contractType}</Badge>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {c.monthlyMinutes != null && `${c.monthlyMinutes} min/mo`}
                {c.retainerAmount != null && ` · Retainer ${c.currency} ${c.retainerAmount}`}
                {c.overageHourlyRate != null && ` · Overage ${c.currency} ${c.overageHourlyRate}/hr`}
              </p>
              <div className="mt-3 flex gap-2">
                {c.status !== "active" && (
                  <Button size="sm" variant="secondary" onClick={() => setStatus(c.id, "active")}>Activate</Button>
                )}
                {c.status === "active" && (
                  <Button size="sm" variant="secondary" onClick={() => setStatus(c.id, "paused")}>Pause</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setStatus(c.id, "cancelled")}>Cancel</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
