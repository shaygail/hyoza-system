import { Suspense } from "react";
import { getPublicPortalConfig } from "@/domain/portal-public";
import { PortalLoginForm } from "./portal-login-form";

export default async function PortalLoginPage() {
  const config = await getPublicPortalConfig();

  return (
    <Suspense>
      <PortalLoginForm
        tenantName={config?.tenantName ?? "HYOZA"}
        portalTitle={config?.portalTitle ?? "Support"}
        logoUrl={config?.branding.logoUrl ?? ""}
        primaryColor={config?.branding.primaryColor ?? "#4f46e5"}
      />
    </Suspense>
  );
}
