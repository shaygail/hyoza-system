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
  _count?: { userRoles: number };
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
  const [canGrantCrm, setCanGrantCrm] = useState(false);
  const [crmSavingRoleId, setCrmSavingRoleId] = useState<string | null>(null);
  const [agreements, setAgreements] = useState<ServiceAgreement[]>([]);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [slaData, setSlaData] = useState<{
    calendars: { id: string; name: string; timezone: string; workDays: string; startTime: string; endTime: string }[];
    policies: { id: string; name: string; priority: { name: string }; responseMinutes: number; resolutionMinutes: number }[];
  } | null>(null);
  const [error, setError] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [newField, setNewField] = useState({ label: "", code: "", fieldType: "text" });
  const [newMailbox, setNewMailbox] = useState({ name: "", emailAddress: "" });

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab]);

  async function loadTab(tab: AdminTab) {
    setError("");
    setSaveMsg("");
    try {
      if (tab === "workflows") {
        const res = await fetch("/api/v1/workflows");
        if (!res.ok) { setError("Unable to load workflows (admin permission required)"); return; }
        setWorkflows(await res.json());
      } else if (tab === "automation") {
        const res = await fetch("/api/v1/automation");
        if (!res.ok) { setError("Unable to load automation rules"); return; }
        setRules(await res.json());
      } else if (tab === "custom-fields") {
        const res = await fetch("/api/v1/custom-fields");
        if (!res.ok) { setError("Unable to load custom fields"); return; }
        setFields(await res.json());
      } else if (tab === "roles") {
        const res = await fetch("/api/v1/admin/roles");
        if (!res.ok) { setError("Unable to load roles"); return; }
        const data = await res.json();
        setRoles(data.roles);
        setCanGrantCrm(Boolean(data.canGrantCrm));
      } else if (tab === "agreements") {
        const res = await fetch("/api/v1/service-agreements");
        if (!res.ok) { setError("Unable to load agreements"); return; }
        setAgreements(await res.json());
      } else if (tab === "email") {
        const res = await fetch("/api/v1/email");
        if (!res.ok) { setError("Unable to load email settings"); return; }
        setMailboxes(await res.json());
      } else if (tab === "sla") {
        const res = await fetch("/api/v1/sla");
        if (!res.ok) { setError("Unable to load SLA settings"); return; }
        setSlaData(await res.json());
      }
    } catch {
      setError("Failed to load settings");
    }
  }

  async function toggleRule(ruleId: string, isActive: boolean) {
    await fetch(`/api/v1/automation/${ruleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    loadTab("automation");
  }

  async function saveSlaPolicy(policyId: string, responseMinutes: number, resolutionMinutes: number) {
    await fetch("/api/v1/sla", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "policy", id: policyId, data: { responseMinutes, resolutionMinutes } }),
    });
    setSaveMsg("SLA policy saved.");
    loadTab("sla");
  }

  async function addCustomField() {
    if (!newField.label || !newField.code) return;
    const res = await fetch("/api/v1/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newField),
    });
    if (res.ok) {
      setNewField({ label: "", code: "", fieldType: "text" });
      loadTab("custom-fields");
    }
  }

  async function addMailbox() {
    if (!newMailbox.name || !newMailbox.emailAddress) return;
    const res = await fetch("/api/v1/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMailbox),
    });
    if (res.ok) {
      setNewMailbox({ name: "", emailAddress: "" });
      loadTab("email");
    }
  }

  async function setCrmAccess(roleId: string, view: boolean, edit: boolean) {
    setCrmSavingRoleId(roleId);
    setError("");
    setSaveMsg("");
    try {
      const res = await fetch("/api/v1/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setCrmAccess", roleId, view, edit }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to update CRM access");
        return;
      }
      setRoles((current) => current.map((role) => (role.id === roleId ? { ...role, ...data } : role)));
      setSaveMsg("CRM access updated. Users must sign out and back in for changes to apply.");
    } finally {
      setCrmSavingRoleId(null);
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

  const saveNotice = saveMsg ? <p className="text-sm text-green-600 mb-4">{saveMsg}</p> : null;

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
        {saveNotice}
        <h2 className="text-lg font-semibold">Automation Rules</h2>
        {rules.length === 0 ? (
          <p className="text-slate-500">No automation rules configured.</p>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium">{rule.name}</span>
                    <p className="text-sm text-slate-500 mt-1">Trigger: {rule.trigger}</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toggleRule(rule.id, !rule.isActive)}
                  >
                    {rule.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
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
        {saveNotice}
        <h2 className="text-lg font-semibold">Custom Fields</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap gap-2">
          <input
            placeholder="Label"
            value={newField.label}
            onChange={(e) => setNewField({ ...newField, label: e.target.value })}
            className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400"
          />
          <input
            placeholder="code_snake_case"
            value={newField.code}
            onChange={(e) => setNewField({ ...newField, code: e.target.value })}
            className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400 font-mono"
          />
          <select
            value={newField.fieldType}
            onChange={(e) => setNewField({ ...newField, fieldType: e.target.value })}
            className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="select">Select</option>
            <option value="checkbox">Checkbox</option>
          </select>
          <Button size="sm" onClick={addCustomField}>Add Field</Button>
        </div>
        {fields.length === 0 ? (
          <p className="text-slate-500">No custom fields defined.</p>
        ) : (
          <table className="w-full text-sm rounded-xl border border-slate-200 overflow-hidden bg-white">
            <thead className="border-b-2 border-slate-200 text-xs font-semibold text-slate-500">
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
        <div>
          <h2 className="text-lg font-semibold">Roles & CRM access</h2>
          <p className="mt-1 text-sm text-slate-500">
            Only Super Admin can grant or revoke CRM access. Other role permissions stay managed as before.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saveMsg && <p className="text-sm text-green-700">{saveMsg}</p>}
        {!canGrantCrm && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Sign in as Super Admin to change CRM access for roles.
          </p>
        )}
        <div className="space-y-3">
          {roles
            .filter((role) => role.code !== "customer")
            .map((role) => {
              const keys = role.rolePermissions.map((rp) => rp.permission.key);
              const hasView = keys.includes("customers.view");
              const hasEdit = keys.includes("customers.edit");
              const locked = role.code === "super_admin" || !canGrantCrm;
              const saving = crmSavingRoleId === role.id;
              return (
                <div key={role.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{role.name}</span>
                    <Badge color={role.isSystem ? "#6366f1" : "#22c55e"}>
                      {role.isSystem ? "System" : "Custom"}
                    </Badge>
                    {role.code === "super_admin" && (
                      <Badge color="#0f766e">Grants CRM</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {role.rolePermissions.length} permissions · code: {role.code}
                    {role._count ? ` · ${role._count.userRoles} users` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <label className={`flex items-center gap-2 ${locked ? "text-slate-400" : "text-slate-700"}`}>
                      <input
                        type="checkbox"
                        checked={hasView || hasEdit}
                        disabled={locked || saving}
                        onChange={(e) =>
                          setCrmAccess(role.id, e.target.checked, e.target.checked ? hasEdit : false)
                        }
                      />
                      CRM view
                    </label>
                    <label className={`flex items-center gap-2 ${locked ? "text-slate-400" : "text-slate-700"}`}>
                      <input
                        type="checkbox"
                        checked={hasEdit}
                        disabled={locked || saving}
                        onChange={(e) =>
                          setCrmAccess(role.id, e.target.checked ? true : hasView, e.target.checked)
                        }
                      />
                      CRM edit
                    </label>
                  </div>
                </div>
              );
            })}
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
        {saveNotice}
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
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap gap-2">
          <input
            placeholder="Mailbox name"
            value={newMailbox.name}
            onChange={(e) => setNewMailbox({ ...newMailbox, name: e.target.value })}
            className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400"
          />
          <input
            placeholder="email@domain.local"
            value={newMailbox.emailAddress}
            onChange={(e) => setNewMailbox({ ...newMailbox, emailAddress: e.target.value })}
            className="rounded-[3px] border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 hover:bg-slate-50 focus:border-ourcloud-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ourcloud-400"
          />
          <Button size="sm" onClick={addMailbox}>Add Mailbox</Button>
        </div>
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
        {saveNotice}
        <div>
          <h2 className="text-lg font-semibold">Business Calendars</h2>
          <div className="mt-3 space-y-2">
            {slaData.calendars.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <p className="font-medium">{c.name}</p>
                <p className="text-slate-500">{c.timezone} · {c.startTime}–{c.endTime}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold">SLA Policies</h2>
          <div className="mt-3 space-y-3">
            {slaData.policies.map((p) => (
              <SlaPolicyEditor key={p.id} policy={p} onSave={saveSlaPolicy} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function SlaPolicyEditor({
  policy,
  onSave,
}: {
  policy: { id: string; name: string; priority: { name: string }; responseMinutes: number; resolutionMinutes: number };
  onSave: (id: string, response: number, resolution: number) => void;
}) {
  const [response, setResponse] = useState(policy.responseMinutes);
  const [resolution, setResolution] = useState(policy.resolutionMinutes);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <p className="font-medium">{policy.name} ({policy.priority.name})</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label>
          <span className="text-xs text-slate-500">Response (min)</span>
          <input
            type="number"
            value={response}
            onChange={(e) => setResponse(Number(e.target.value))}
            className="mt-1 block w-24 rounded-lg border border-slate-200 px-2 py-1"
          />
        </label>
        <label>
          <span className="text-xs text-slate-500">Resolution (min)</span>
          <input
            type="number"
            value={resolution}
            onChange={(e) => setResolution(Number(e.target.value))}
            className="mt-1 block w-24 rounded-lg border border-slate-200 px-2 py-1"
          />
        </label>
        <Button size="sm" variant="secondary" onClick={() => onSave(policy.id, response, resolution)}>
          Save
        </Button>
      </div>
    </div>
  );
}
