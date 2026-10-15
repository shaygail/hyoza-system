import Link from "next/link";
import { PortalPublicShell } from "@/components/portal/portal-public-shell";
import { getPublicPortalConfig } from "@/domain/portal-public";

export default async function SupportConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const { ticket } = await searchParams;
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
      <div className="mx-auto max-w-lg rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          ✓
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Request submitted</h1>
        {ticket && (
          <p className="mt-2 font-mono text-sm text-slate-700">{ticket}</p>
        )}
        <p className="mt-4 text-sm text-slate-600">
          We sent a confirmation email with a link to view your request and any replies. No sign-in
          required — use that link anytime.
        </p>
        <Link
          href="/support/submit"
          className="mt-6 inline-block text-sm font-medium text-ourcloud-700 hover:underline"
        >
          Submit another request
        </Link>
      </div>
    </PortalPublicShell>
  );
}
