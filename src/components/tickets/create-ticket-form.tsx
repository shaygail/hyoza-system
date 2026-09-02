"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";

interface Metadata {
  priorities: { id: string; name: string }[];
  ticketTypes: { id: string; name: string }[];
  technicians: { id: string; name: string; email: string }[];
  routingCategories: { id: string; name: string; code: string }[];
  organisations: { id: string; name: string; contacts: { id: string; name: string }[] }[];
}

const TEAM_BY_CATEGORY: Record<string, string> = {
  accounts: "Accounts",
  support: "Support",
  admin: "Admin",
};

export function CreateTicketForm({ metadata }: { metadata: Metadata }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orgId, setOrgId] = useState("");
  const [form, setForm] = useState({
    subject: "",
    description: "",
    contactId: "",
    priorityId: metadata.priorities.find((p) => p.name === "Medium")?.id ?? metadata.priorities[0]?.id,
    ticketTypeId: metadata.ticketTypes[0]?.id,
    assigneeId: null as string | null,
    categoryId: metadata.routingCategories.find((c) => c.code === "support")?.id ?? "",
  });

  const selectedOrg = metadata.organisations.find((o) => o.id === orgId);
  const selectedCategory = metadata.routingCategories.find((c) => c.id === form.categoryId);
  const teamName = selectedCategory ? TEAM_BY_CATEGORY[selectedCategory.code] ?? "—" : "—";

  const technicianOptions = useMemo(
    () =>
      metadata.technicians.map((technician) => ({
        id: technician.id,
        label: technician.name,
        hint: technician.email,
      })),
    [metadata.technicians]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/v1/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        organisationId: orgId,
        assigneeId: form.assigneeId || undefined,
        contactId: form.contactId || undefined,
        categoryId: form.categoryId || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create ticket");
      return;
    }

    const ticket = await res.json();
    router.push(`/app/tickets/${ticket.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <div>
        <Label>Customer *</Label>
        <Select value={orgId} onChange={(e) => { setOrgId(e.target.value); setForm({ ...form, contactId: "" }); }} required>
          <option value="">Select customer...</option>
          {metadata.organisations.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </Select>
      </div>

      {selectedOrg && selectedOrg.contacts.length > 0 && (
        <div>
          <Label>Contact</Label>
          <Select value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
            <option value="">Select contact...</option>
            {selectedOrg.contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type *</Label>
          <Select value={form.ticketTypeId} onChange={(e) => setForm({ ...form, ticketTypeId: e.target.value })} required>
            {metadata.ticketTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Priority *</Label>
          <Select value={form.priorityId} onChange={(e) => setForm({ ...form, priorityId: e.target.value })} required>
            {metadata.priorities.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Category *</Label>
          <Select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            required
          >
            <option value="">Select category...</option>
            {metadata.routingCategories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Team</Label>
          <Input readOnly value={teamName} className="bg-slate-50 text-slate-600" />
        </div>
      </div>

      <div>
        <Label>Subject *</Label>
        <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
      </div>

      <div>
        <Label>Description *</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
      </div>

      <div>
        <Label>Assignee</Label>
        <SearchSelect
          options={technicianOptions}
          value={form.assigneeId}
          onChange={(assigneeId) => setForm({ ...form, assigneeId })}
          placeholder="Search technicians..."
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Ticket"}</Button>
      </div>
    </form>
  );
}
