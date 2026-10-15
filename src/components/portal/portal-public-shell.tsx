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
        <div className={`mx-auto flex h-14 items-center justify-between px-4 ${embed ? "max-w-lg" : "max-w-5xl"}`}>
          <div className="flex items-center gap-2.5">
            {config.branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.branding.logoUrl} alt={config.tenantName} className="h-8 w-auto" />
            ) : (
              <span
                className="flex h-7 w-7 items-center justify-center rounded-[4px] text-white"
                style={{ backgroundColor: primary }}
              >
                <Cloud className="h-4 w-4" strokeWidth={2.5} />
              </span>
            )}
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {config.tenantName} {config.portalTitle}
              </div>
              {!embed && <div className="text-xs text-slate-500">Customer support portal</div>}
            </div>
          </div>
        </div>
      </header>

      <main className={`mx-auto px-4 py-8 ${embed ? "max-w-lg" : "max-w-5xl"}`}>{children}</main>

      {!embed && (
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
          Powered by{" "}
          <span className="font-medium text-slate-500">HYOZA System</span>
        </footer>
      )}
    </div>
  );
}
