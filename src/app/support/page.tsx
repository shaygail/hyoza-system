import Link from "next/link";
import { getPublicPortalConfig } from "@/domain/portal-public";
import { PortalPublicShell } from "@/components/portal/portal-public-shell";
import { PublicSubmitTicketForm } from "@/components/portal/public-submit-form";
import { Button } from "@/components/ui/button";
import { BookOpen, MessageSquarePlus } from "lucide-react";

export default async function SupportPage() {
  const config = await getPublicPortalConfig();
  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Support portal is not available.</p>
      </div>
    );
  }

  const primary = config.branding.primaryColor;

  return (
    <PortalPublicShell config={config}>
      <section className="rounded-[4px] px-8 py-12 text-white md:px-12" style={{ backgroundColor: primary }}>
        <h1 className="text-3xl font-semibold md:text-4xl">
          {config.tenantName} {config.portalTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-white/85">{config.welcomeMessage}</p>
        <div className="mt-8">
          <Link href="/support/submit">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
              <MessageSquarePlus className="mr-2 h-4 w-4" style={{ color: primary }} />
              Raise a request
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-white/75">
          No sign-in required. We&apos;ll email you a link to track your request and notify you of updates.
        </p>
      </section>

      {config.articles.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900">Help articles</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {config.articles.map((article) => (
              <div
                key={article.id}
                className="rounded-[4px] bg-white p-5 shadow-card"
              >
                <h3 className="font-medium text-slate-900">{article.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                  {article.body.slice(0, 160)}
                  {article.body.length > 160 ? "…" : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8" id="submit">
        <PublicSubmitTicketForm primaryColor={primary} />
      </section>
    </PortalPublicShell>
  );
}
