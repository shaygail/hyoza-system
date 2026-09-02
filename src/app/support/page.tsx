import Link from "next/link";
import { getPublicPortalConfig } from "@/domain/portal-public";
import { PortalPublicShell } from "@/components/portal/portal-public-shell";
import { Button } from "@/components/ui/button";
import { BookOpen, LogIn, MessageSquarePlus } from "lucide-react";

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
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
        <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
          {config.tenantName} {config.portalTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">{config.welcomeMessage}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/portal/login">
            <Button style={{ backgroundColor: primary }} className="text-white hover:opacity-90">
              <LogIn className="mr-2 h-4 w-4" />
              Sign in to your account
            </Button>
          </Link>
          <Link href="/portal/login?returnTo=/portal/tickets/new">
            <Button variant="secondary">
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              Submit a request
            </Button>
          </Link>
        </div>
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
                className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition-colors"
              >
                <h3 className="font-medium text-slate-900">{article.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                  {article.body.slice(0, 160)}
                  {article.body.length > 160 ? "…" : ""}
                </p>
                <p className="mt-3 text-xs text-slate-400">Sign in to view full articles</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        <p>Already have an account?</p>
        <Link href="/portal/login" className="mt-1 inline-block font-medium hover:underline" style={{ color: primary }}>
          Sign in to view your tickets →
        </Link>
      </section>
    </PortalPublicShell>
  );
}
