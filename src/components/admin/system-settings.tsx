"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function SystemSettingsPanel() {
  const [timezone, setTimezone] = useState("Europe/London");
  const [portalTitle, setPortalTitle] = useState("Support");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4f46e5");
  const [tenantName, setTenantName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/v1/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setTimezone(data.timezone);
        setPortalTitle(data.portalTitle);
        setLogoUrl(data.branding?.logoUrl ?? "");
        setPrimaryColor(data.branding?.primaryColor ?? "#4f46e5");
        setTenantName(data.tenantName ?? "");
      })
      .catch(() => setError("Failed to load settings"));
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    const res = await fetch("/api/v1/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timezone,
        portalTitle,
        branding: { logoUrl, primaryColor },
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Settings saved.");
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">System Settings</h2>
        <p className="text-sm text-slate-500">
          Organisation: {tenantName || "—"} · timezone, portal branding, and defaults
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="Europe/London">Europe/London</option>
            <option value="Europe/Dublin">Europe/Dublin</option>
            <option value="America/New_York">America/New_York</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Customer portal title</label>
          <input
            type="text"
            value={portalTitle}
            onChange={(e) => setPortalTitle(e.target.value)}
            placeholder="Support"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate-400">Shown as &quot;{'{Organisation}'} {portalTitle}&quot; in the portal</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Logo URL</label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Primary colour</label>
          <div className="mt-1 flex gap-2">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-14 rounded border border-slate-200"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>
      </div>
    </div>
  );
}
