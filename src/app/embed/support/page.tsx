import Link from "next/link";
import { getPublicPortalConfig } from "@/domain/portal-public";
import { PortalPublicShell } from "@/components/portal/portal-public-shell";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";

export default async function EmbedSupportPage() {
  const config = await getPublicPortalConfig();
  if (!config) return null;

  const primary = config.branding.primaryColor;

  return (
    <PortalPublicShell config={config} embed>
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          {config.tenantName} {config.portalTitle}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{config.welcomeMessage}</p>
        <div className="mt-5">
          <Link href="/support/submit" target="_blank" rel="noopener noreferrer">
            <Button style={{ backgroundColor: primary }} className="w-full text-white hover:opacity-90 sm:w-auto">
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              Submit a request
            </Button>
          </Link>
        </div>
        <p className="mt-3 text-xs text-slate-400">No sign-in required</p>
      </div>
    </PortalPublicShell>
  );
}
