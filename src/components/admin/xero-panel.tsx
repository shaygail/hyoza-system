"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function XeroPanel() {
  const [connection, setConnection] = useState<{
    isConnected: boolean;
    tenantName: string | null;
    lastSyncedAt: string | null;
  } | null>(null);
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);
  const [stubMode, setStubMode] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/v1/xero");
    if (!res.ok) {
      setError("Unable to load Xero settings (billing.view required)");
      return;
    }
    const data = await res.json();
    setConnection(data.connection);
    setAuthorizeUrl(data.authorizeUrl);
    setStubMode(data.stubMode);
  }

  useEffect(() => {
    load();
  }, []);

  async function connect() {
    if (authorizeUrl) {
      window.location.href = authorizeUrl;
      return;
    }
    const res = await fetch("/api/v1/xero", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Connect failed");
      return;
    }
    setMsg("Connected to Xero (demo stub). Set XERO_CLIENT_ID for real OAuth.");
    load();
  }

  async function disconnect() {
    await fetch("/api/v1/xero", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect" }),
    });
    setMsg("Disconnected");
    load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Xero</h2>
        <p className="text-sm text-slate-500">
          Connect Xero for accountants. Push approved invoices and map account contacts.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-green-700">{msg}</p>}

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">Status</span>
          <Badge color={connection?.isConnected ? "#22c55e" : "#6b7280"}>
            {connection?.isConnected ? "Connected" : "Not connected"}
          </Badge>
          {stubMode && <Badge color="#f59e0b">Stub mode</Badge>}
        </div>
        {connection?.tenantName && (
          <p className="text-sm text-slate-600">Org: {connection.tenantName}</p>
        )}
        {connection?.lastSyncedAt && (
          <p className="text-xs text-slate-400">Last sync: {new Date(connection.lastSyncedAt).toLocaleString()}</p>
        )}
        <div className="flex gap-2">
          {!connection?.isConnected ? (
            <Button size="sm" onClick={connect}>Connect Xero</Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={disconnect}>Disconnect</Button>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Real OAuth: set <code>XERO_CLIENT_ID</code> and <code>XERO_CLIENT_SECRET</code> in `.env`.
          Until then, connect uses a local stub and invoice push logs to the server console.
        </p>
      </div>
    </div>
  );
}
