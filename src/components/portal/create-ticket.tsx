"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label } from "@/components/ui/input";

export function PortalCreateTicket({ priorities, ticketTypes }: {
  priorities: { id: string; name: string }[];
  ticketTypes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    description: "",
    priorityId: priorities.find((p) => p.name === "Medium")?.id ?? priorities[0]?.id,
    ticketTypeId: ticketTypes[0]?.id,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/v1/portal/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      const ticket = await res.json();
      router.push(`/portal/tickets/${ticket.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold">Create Ticket</h1>
      <div>
        <Label>Type</Label>
        <Select value={form.ticketTypeId} onChange={(e) => setForm({ ...form, ticketTypeId: e.target.value })} required>
          {ticketTypes.filter((t) => t.name !== "Task").map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Priority</Label>
        <Select value={form.priorityId} onChange={(e) => setForm({ ...form, priorityId: e.target.value })} required>
          {priorities.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>
      <div>
        <Label>Subject</Label>
        <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
      </div>
      <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Submit Ticket"}</Button>
    </form>
  );
}
