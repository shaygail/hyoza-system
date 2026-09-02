import Link from "next/link";
import { getPublicPortalConfig } from "@/domain/portal-public";
import { PortalPublicShell } from "@/components/portal/portal-public-shell";
import { PublicSubmitTicketForm } from "@/components/portal/public-submit-form";

export default async function SupportSubmitPage() {
  const config = await getPublicPortalConfig();
  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Support portal is not available.</p>
      </div>
    );
  }

  return (
    <PortalPublicShell config={config}>
      <div className="mb-4">
        <Link href="/support" className="text-sm text-slate-500 hover:underline">
          ← Back to support home
        </Link>
      </div>
      <PublicSubmitTicketForm primaryColor={config.branding.primaryColor} />
    </PortalPublicShell>
  );
}
