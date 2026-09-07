"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface Role {
  id: string;
  name: string;
  code: string;
  isSystem: boolean;
  securityLevel?: number;
  rolePermissions: { permission: { key: string } }[];
}

interface Permission {
  key: string;
  description: string | null;
}

interface BrowseScheme {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isDefault: boolean;
  role: { name: string; code: string } | null;
}

interface Audit {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  createdAt: string;
}

export function SecurityPanel() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [schemes, setSchemes] = useState<BrowseScheme[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setError("");
    const [rolesRes, schemesRes, auditsRes] = await Promise.all([
      fetch("/api/v1/admin/roles"),
      fetch("/api/v1/security?resource=schemes"),
      fetch("/api/v1/security?resource=audits"),
    ]);
    if (!rolesRes.ok) {
      setError("Unable to load security settings (admin.users required)");
      return;
    }
    const rolesData = await rolesRes.json();
    setRoles(rolesData.roles);
    setPermissions(rolesData.permissions ?? []);
    setCanEdit(Boolean(rolesData.canManageSecurity));
    if (!selectedRoleId && rolesData.roles?.[0]) {
      const first = rolesData.roles.find((r: Role) => r.code !== "customer") ?? rolesData.roles[0];
      setSelectedRoleId(first.id);
    }
    if (schemesRes.ok) setSchemes(await schemesRes.json());
    if (auditsRes.ok) setAudits(await auditsRes.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = roles.find((r) => r.id === selectedRoleId);
  const selectedKeys = new Set(selected?.rolePermissions.map((rp) => rp.permission.key) ?? []);

  async function togglePermission(key: string) {
    if (!selected || selected.code === "super_admin" || !canEdit) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    const res = await fetch("/api/v1/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "setPermissions",
        roleId: selected.id,
        permissionKeys: Array.from(next),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to update permissions");
      return;
    }
    setMsg("Permissions updated. Users must sign out and back in.");
    load();
  }

  async function setLevel(level: number) {
    if (!selected || !canEdit) return;
    const res = await fetch("/api/v1/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "setSecurityLevel",
        roleId: selected.id,
        securityLevel: level,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setMsg("Security level updated");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Security</h2>
        <p className="text-sm text-slate-500">
          Permission matrix, security levels (BMS-style), browse schemes (Jira-lite), and audit log.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      {!canEdit && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Sign in as Super Admin to edit the matrix and security levels.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <h3 className="font-medium text-sm">Roles</h3>
          {roles
            .filter((r) => r.code !== "customer")
            .map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRoleId(r.id)}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                  selectedRoleId === r.id ? "bg-ourcloud-50 text-ourcloud-700" : "hover:bg-slate-50"
                }`}
              >
                <span className="font-medium">{r.name}</span>
                <span className="ml-2 text-xs text-slate-400">L{r.securityLevel ?? 1}</span>
              </button>
            ))}
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          {selected && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{selected.name}</h3>
                <Badge color={selected.isSystem ? "#6366f1" : "#22c55e"}>
                  {selected.isSystem ? "System" : "Custom"}
                </Badge>
                <label className="ml-auto flex items-center gap-2 text-sm">
                  Security level
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
                    key={`${selected.id}-${selected.securityLevel}`}
                    defaultValue={selected.securityLevel ?? 1}
                    disabled={!canEdit || selected.code === "super_admin"}
                    onBlur={(e) => setLevel(Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 max-h-96 overflow-auto">
                {permissions.map((p) => (
                  <label key={p.key} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedKeys.has(p.key)}
                      disabled={!canEdit || selected.code === "super_admin"}
                      onChange={() => togglePermission(p.key)}
                    />
                    <span>
                      <span className="font-mono text-xs text-slate-700">{p.key}</span>
                      {p.description && (
                        <span className="block text-xs text-slate-400">{p.description}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h3 className="font-medium">Browse schemes</h3>
        {schemes.map((s) => (
          <div key={s.id} className="flex justify-between text-sm border-t border-slate-100 pt-2">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-slate-500">{s.description}</p>
            </div>
            <div className="text-right text-slate-500">
              <p className="font-mono text-xs">{s.code}</p>
              {s.isDefault && <Badge color="#3b82f6">Default</Badge>}
              {s.role && <p className="text-xs">{s.role.name}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <h3 className="font-medium">Security audit</h3>
        {audits.length === 0 ? (
          <p className="text-sm text-slate-500">No audit events yet.</p>
        ) : (
          audits.slice(0, 20).map((a) => (
            <div key={a.id} className="text-xs text-slate-600 border-t border-slate-100 pt-2">
              <span className="font-mono">{a.action}</span> · {a.targetType}
              {a.targetId && ` · ${a.targetId.slice(0, 8)}`}
              <span className="ml-2 text-slate-400">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
