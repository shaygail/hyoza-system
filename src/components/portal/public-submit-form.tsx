"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label } from "@/components/ui/input";
import { Mail } from "lucide-react";

interface FormOptions {
  priorities: { id: string; name: string }[];
  ticketTypes: { id: string; name: string }[];
}

export function PublicSubmitTicketForm({ primaryColor = "#4f46e5" }: { primaryColor?: string }) {
  const router = useRouter();
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    description: "",
    priorityId: "",
    ticketTypeId: "",
  });

  useEffect(() => {
    fetch("/api/v1/public/support/options")
      .then((r) => r.json())
      .then((data) => {
        if (data.priorities) {
          setOptions(data);
          setForm((f) => ({
            ...f,
            priorityId: data.priorities.find((p: { name: string }) => p.name === "Medium")?.id ?? data.priorities[0]?.id,
            ticketTypeId: data.ticketTypes[0]?.id ?? "",
          }));
        }
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/v1/public/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to submit ticket");
      return;
    }
    router.push(`/support/confirmation?ticket=${data.ticketNumber}&token=${data.accessToken}`);
  }

  if (!options) {
    return <p className="text-sm text-slate-500">Loading form...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-xl font-semibold text-slate-900">Submit a support request</h2>
      <p className="text-sm text-slate-500">
        No account needed. We&apos;ll email you a link to track your ticket and get updates.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Your name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <Label>Email address</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@company.example"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Request type</Label>
          <Select
            value={form.ticketTypeId}
            onChange={(e) => setForm({ ...form, ticketTypeId: e.target.value })}
            required
          >
            {options.ticketTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Priority</Label>
          <Select
            value={form.priorityId}
            onChange={(e) => setForm({ ...form, priorityId: e.target.value })}
            required
          >
            {options.priorities.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label>Subject</Label>
        <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
      </div>

      <div>
        <Label>How can we help?</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={6}
          required
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="text-white hover:opacity-90"
        style={{ backgroundColor: primaryColor }}
      >
        <Mail className="mr-2 h-4 w-4" />
        {loading ? "Submitting..." : "Submit request"}
      </Button>
    </form>
  );
}
