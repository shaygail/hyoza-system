import Link from "next/link";
import { Cloud } from "lucide-react";

interface PortalConfig {
  tenantName: string;
  portalTitle: string;
  welcomeMessage?: string;
  branding: { logoUrl: string; primaryColor: string };
}

export function PortalPublicShell({
  config,
  children,
  embed = false,
}: {
  config: PortalConfig;
  children: React.ReactNode;
  embed?: boolean;
}) {
  const primary = config.branding.primaryColor;

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={{ "--portal-primary": primary } as React.CSSProperties}
    >
      <header className="border-b border-slate-200 bg-white">
        <div className={`mx-auto flex items-center justify-between px-4 py-4 ${embed ? "max-w-lg" : "max-w-4xl"}`}>
          <div className="flex items-center gap-3">
            {config.branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.branding.logoUrl} alt={config.tenantName} className="h-9 w-auto" />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: primary }}
              >
                <Cloud className="h-5 w-5" />
              </div>
            )}
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {config.tenantName} {config.portalTitle}
              </div>
              {!embed && <div className="text-xs text-slate-500">Customer support portal</div>}
            </div>
          </div>
          {!embed && (
            <Link
              href="/portal/login"
              className="text-sm font-medium hover:underline"
              style={{ color: primary }}
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className={`mx-auto p-6 ${embed ? "max-w-lg" : "max-w-4xl"}`}>{children}</main>

      {!embed && (
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
          Powered by{" "}
          <span className="font-medium text-slate-500">OurCloud Service Desk</span>
        </footer>
      )}
    </div>
  );
}
