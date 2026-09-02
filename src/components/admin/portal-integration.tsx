"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" size="sm" onClick={copy}>
      {copied ? "Copied!" : label}
    </Button>
  );
}

export function PortalIntegrationPanel({
  baseUrl,
  portalTitle,
  welcomeMessage,
  onWelcomeChange,
}: {
  baseUrl: string;
  portalTitle: string;
  welcomeMessage: string;
  onWelcomeChange: (v: string) => void;
}) {
  const supportUrl = `${baseUrl}/support`;
  const loginUrl = `${baseUrl}/portal/login`;
  const embedUrl = `${baseUrl}/embed/support`;

  const linkHtml = `<a href="${supportUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-family:sans-serif;font-size:14px;">${portalTitle}</a>`;

  const iframeHtml = `<iframe src="${embedUrl}" width="100%" height="320" frameborder="0" style="border:1px solid #e2e8f0;border-radius:12px;" title="Customer Support"></iframe>`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
      <div>
        <h3 className="font-medium text-slate-900">Website integration</h3>
        <p className="mt-1 text-sm text-slate-500">
          Link these URLs from your website, or embed the support widget in a page.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Welcome message</label>
        <textarea
          value={welcomeMessage}
          onChange={(e) => onWelcomeChange(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Shown on the public support page"
        />
      </div>

      <div className="space-y-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-600">Support home (link from your website)</p>
          <code className="mt-1 block break-all text-sm text-slate-800">{supportUrl}</code>
          <div className="mt-2">
            <CopyButton text={supportUrl} label="Copy URL" />
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-600">Customer sign-in</p>
          <code className="mt-1 block break-all text-sm text-slate-800">{loginUrl}</code>
          <div className="mt-2">
            <CopyButton text={loginUrl} label="Copy URL" />
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-600">Website button (HTML)</p>
          <pre className="mt-1 overflow-x-auto rounded bg-white p-2 text-xs text-slate-700 border border-slate-200">{linkHtml}</pre>
          <div className="mt-2">
            <CopyButton text={linkHtml} label="Copy HTML" />
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-600">Embed widget (iframe)</p>
          <pre className="mt-1 overflow-x-auto rounded bg-white p-2 text-xs text-slate-700 border border-slate-200">{iframeHtml}</pre>
          <div className="mt-2 flex gap-2">
            <CopyButton text={iframeHtml} label="Copy embed code" />
            <a href={embedUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm">Preview widget</Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
