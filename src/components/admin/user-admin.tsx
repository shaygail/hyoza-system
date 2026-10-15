"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Role {
  id: string;
  name: string;
  code: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  userRoles: { role: Role }[];
}

export function UserAdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [editing, setEditing] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/v1/admin/users");
    if (!res.ok) {
      setError("You need administrator permissions to manage users.");
      return;
    }
    const data = await res.json();
    setUsers(data.users);
    setRoles(data.roles.filter((r: Role) => r.code !== "customer"));
  }

  function startEdit(user: User) {
    setEditing(user);
    setSelectedRoles(user.userRoles.map((ur) => ur.role.id));
    setError("");
  }

  async function saveRoles() {
    if (!editing) return;
    setSaving(true);
    const res = await fetch(`/api/v1/admin/users/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleIds: selectedRoles }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Failed to update roles");
      return;
    }
    setEditing(null);
    load();
  }

  async function toggleActive(user: User) {
    await fetch(`/api/v1/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Users & roles</h2>
        <p className="text-sm text-slate-500">Assign agent, administrator, manager, and other roles</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-slate-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Name</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Email</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Roles</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Status</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-3 py-2.5 font-medium">{user.name}</td>
                <td className="px-3 py-2.5 text-slate-600">{user.email}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {user.userRoles.map((ur) => (
                      <Badge key={ur.role.id} color="#6366f1">{ur.role.name}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <Badge color={user.isActive ? "#22c55e" : "#6b7280"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => startEdit(user)}>Edit Roles</Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(user)}>
                      {user.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091e427d]">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="font-semibold text-slate-900">Edit roles — {editing.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{editing.email}</p>
            <div className="mt-4 space-y-2">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoles([...selectedRoles, role.id]);
                      } else {
                        setSelectedRoles(selectedRoles.filter((id) => id !== role.id));
                      }
                    }}
                  />
                  <span className="font-medium">{role.name}</span>
                  <span className="text-slate-400">({role.code})</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex gap-2">
              <Button onClick={saveRoles} disabled={saving || selectedRoles.length === 0}>
                {saving ? "Saving..." : "Save Roles"}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Available roles</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li><strong>Agent</strong> — standard ticket operations</li>
          <li><strong>Senior Agent</strong> — delete tickets, all queues</li>
          <li><strong>Team Leader</strong> — team management, reassignment</li>
          <li><strong>Manager</strong> — all tickets, reports, SLA views</li>
          <li><strong>Administrator</strong> — full configuration access</li>
          <li><strong>Finance</strong> — customers, time, reports</li>
        </ul>
      </div>
    </div>
  );
}
