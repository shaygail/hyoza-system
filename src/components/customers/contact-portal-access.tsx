"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ContactPortalAccess({
  contactId,
  contactName,
  hasPortalUser,
  portalAccess,
}: {
  contactId: string;
  contactName: string;
  hasPortalUser: boolean;
  portalAccess: boolean;
}) {
  const [enabled, setEnabled] = useState(hasPortalUser || portalAccess);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function enableAccess() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/v1/contacts/${contactId}/portal-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to enable portal access");
      return;
    }
    const data = await res.json();
    setEnabled(true);
    if (data.tempPassword) setTempPassword(data.tempPassword);
  }

  return (
    <div className="mt-2">
      {enabled ? (
        <Badge color="#22c55e">Portal access enabled</Badge>
      ) : (
        <Button variant="secondary" size="sm" onClick={enableAccess} disabled={loading}>
          {loading ? "Enabling..." : "Enable Portal Access"}
        </Button>
      )}
      {tempPassword && (
        <p className="mt-2 text-xs text-amber-700">
          Temporary password for {contactName}: <code className="bg-amber-100 px-1 rounded">{tempPassword}</code>
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
