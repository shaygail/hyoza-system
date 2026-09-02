"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  baseUrl: string;
};

function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button type="button" variant="secondary" size="sm" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

export function PortalIntegrationPanel({ baseUrl }: Props) {
  const supportUrl = `${baseUrl}/support`;
  const submitUrl = `${baseUrl}/support/submit`;
  const embedUrl = `${baseUrl}/embed/support`;

  const embedHtml = `<iframe
  src="${embedUrl}"
  title="Support"
  width="100%"
  height="520"
  style="border:0;border-radius:12px;max-width:720px;"
  loading="lazy"
></iframe>`;

  return (
    <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Customer portal (no sign-in)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Customers submit requests without an account. They receive email with a secure link to view
          updates, replies, and status changes.
        </p>
      </div>

      <CopyField
        label="Support home"
        value={supportUrl}
        hint="Link from your website navigation or footer."
      />
      <CopyField
        label="Submit request (direct)"
        value={submitUrl}
        hint="Deep link straight to the request form."
      />
      <CopyField
        label="Embeddable widget URL"
        value={embedUrl}
        hint="Lightweight page for iframes on your site."
      />
      <CopyField
        label="Embed HTML"
        value={embedHtml}
        hint="Paste into your CMS or site builder."
      />

      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Email notifications</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Confirmation when a request is created (includes view link)</li>
          <li>Notification when your team replies</li>
          <li>Notification when status changes</li>
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          In development, emails are logged to the server console. Configure SMTP in production.
        </p>
      </div>
    </div>
  );
}
