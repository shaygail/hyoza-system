"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Workflow {
  id: string;
  name: string;
  isDefault: boolean;
  statuses: { id: string; name: string; code: string; pausesSla: boolean }[];
  transitions: {
    id: string;
    name: string;
    conditions: string;
    actions: string;
    fromStatus: { name: string };
    toStatus: { name: string };
  }[];
}

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  isActive: boolean;
  conditions: string;
  actions: string;
}

interface CustomField {
  id: string;
  label: string;
  code: string;
  fieldType: string;
  isRequired: boolean;
}

interface Role {
  id: string;
  name: string;
  code: string;
  isSystem: boolean;
  rolePermissions: { permission: { key: string } }[];
}

interface ServiceAgreement {
  id: string;
  name: string;
  monthlyMinutesAllowance: number | null;
  organisation: { name: string };
  isActive: boolean;
}

interface Mailbox {
  id: string;
  name: string;
  emailAddress: string;
  isActive: boolean;
}

type AdminTab = "workflows" | "automation" | "custom-fields" | "roles" | "agreements" | "email" | "sla";

export function AdminSettingsPanel({ activeTab }: { activeTab: AdminTab }) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [agreements, setAgreements] = useState<ServiceAgreement[]>([]);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [slaData, setSlaData] = useState<{ calendars: { name: string; timezone: string; workDays: string; startTime: string; endTime: string }[]; policies: { name: string; priority: { name: string }; responseMinutes: number; resolutionMinutes: number }[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab]);

  async function loadTab(tab: AdminTab) {
    setError("");
    try {
      if (tab === "workflows") {
        const res = await fetch("/api/v1/workflows");
        if (res.ok) setWorkflows(await res.json());
      } else if (tab === "automation") {
        const res = await fetch("/api/v1/automation");
        if (res.ok) setRules(await res.json());
      } else if (tab === "custom-fields") {
        const res = await fetch("/api/v1/custom-fields");
        if (res.ok) setFields(await res.json());
      } else if (tab === "roles") {
        const res = await fetch("/api/v1/admin/roles");
        if (res.ok) {
          const data = await res.json();
          setRoles(data.roles);
        }
      } else if (tab === "agreements") {
        const res = await fetch("/api/v1/service-agreements");
        if (res.ok) setAgreements(await res.json());
      } else if (tab === "email") {
        const res = await fetch("/api/v1/email");
        if (res.ok) setMailboxes(await res.json());
      } else if (tab === "sla") {
        const res = await fetch("/api/v1/sla");
        if (res.ok) setSlaData(await res.json());
      }
    } catch {
      setError("Failed to load settings");
    }
  }

  async function simulateEmail(mailboxId: string) {
    const res = await fetch("/api/v1/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "simulate",
        mailboxId,
        fromAddress: "john.smith@abc-limited.example",
        subject: "Email test: printer issue",
        body: "This is a simulated inbound email creating a ticket.",
      }),
    });
    if (res.ok) {
      alert("Email processed — check Tickets for the new ticket.");
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  if (activeTab === "workflows") {
    const wf = workflows[0];
    if (!wf) return <p className="text-slate-500">Loading workflows...</p>;
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">{wf.name}</h2>
          <p className="text-sm text-slate-500">Statuses and transitions with conditions</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-medium mb-3">Statuses</h3>
            <div className="space-y-2">
              {wf.statuses.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span>{s.name}</span>
                  {s.pausesSla && <Badge color="#f59e0b">Pauses SLA</Badge>}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-medium mb-3">Transitions</h3>
            <div className="space-y-2">
              {wf.transitions.map((t) => (
                <div key={t.id} className="text-sm border-b border-slate-100 pb-2">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-slate-400"> ({t.fromStatus.name} → {t.toStatus.name})</span>
                  {JSON.parse(t.conditions || "[]").length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">Has conditions</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "automation") {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Automation Rules</h2>
        {rules.length === 0 ? (
          <p className="text-slate-500">No automation rules configured.</p>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{rule.name}</span>
                  <Badge color={rule.isActive ? "#22c55e" : "#6b7280"}>
                    {rule.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 mt-1">Trigger: {rule.trigger}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "custom-fields") {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Custom Fields</h2>
        {fields.length === 0 ? (
          <p className="text-slate-500">No custom fields defined.</p>
        ) : (
          <table className="w-full text-sm rounded-xl border border-slate-200 overflow-hidden">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left">Label</th>
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Required</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{f.label}</td>
                  <td className="px-4 py-2 text-slate-500">{f.code}</td>
                  <td className="px-4 py-2">{f.fieldType}</td>
                  <td className="px-4 py-2">{f.isRequired ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  if (activeTab === "roles") {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Custom Roles</h2>
        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">{role.name}</span>
                <Badge color={role.isSystem ? "#6366f1" : "#22c55e"}>
                  {role.isSystem ? "System" : "Custom"}
                </Badge>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {role.rolePermissions.length} permissions · code: {role.code}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === "agreements") {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Service Agreements</h2>
        {agreements.length === 0 ? (
          <p className="text-slate-500">No service agreements configured.</p>
        ) : (
          <div className="space-y-3">
            {agreements.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.name}</span>
                  <Badge color={a.isActive ? "#22c55e" : "#6b7280"}>
                    {a.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {a.organisation.name}
                  {a.monthlyMinutesAllowance && ` · ${a.monthlyMinutesAllowance} min/month`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "email") {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Email-to-Ticket</h2>
        {mailboxes.map((mb) => (
          <div key={mb.id} className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{mb.name}</p>
              <p className="text-sm text-slate-500">{mb.emailAddress}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => simulateEmail(mb.id)}>
              Simulate Email
            </Button>
          </div>
        ))}
        <p className="text-sm text-slate-500">
          Run <code className="bg-slate-100 px-1 rounded">npm run email:worker</code> to process pending inbound emails.
        </p>
      </div>
    );
  }

  if (activeTab === "sla") {
    if (!slaData) return <p className="text-slate-500">Loading SLA settings...</p>;
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Business Calendars</h2>
          <div className="mt-3 space-y-2">
            {slaData.calendars.map((c, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <p className="font-medium">{c.name}</p>
                <p className="text-slate-500">{c.timezone} · {c.startTime}–{c.endTime}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold">SLA Policies</h2>
          <div className="mt-3 space-y-2">
            {slaData.policies.map((p, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <p className="font-medium">{p.name} ({p.priority.name})</p>
                <p className="text-slate-500">Response: {p.responseMinutes}m · Resolution: {p.resolutionMinutes}m</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
