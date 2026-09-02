import { PortalPublicShell } from "@/components/portal/portal-public-shell";
import { GuestTicketView } from "@/components/portal/guest-ticket-view";
import { getPublicPortalConfig } from "@/domain/portal-public";

export default async function GuestTicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const config = await getPublicPortalConfig();
  const { token } = await params;

  if (!config) {
    return <p className="p-8 text-slate-500">Support portal is not available.</p>;
  }

  return (
    <PortalPublicShell config={config}>
      <GuestTicketView token={token} />
    </PortalPublicShell>
  );
}
