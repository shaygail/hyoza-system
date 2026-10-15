import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAsset } from "@/domain/assets";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const asset = await getAsset(session.user.tenantId, id);
  if (!asset) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={asset.assetTag}
        description={`${asset.name} · ${asset.organisation.name}`}
        breadcrumbs={[{ label: "Assets", href: "/app/assets" }]}
      />

      <div className="rounded-[4px] border border-slate-200">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Details</h2>
        <dl className="grid grid-cols-1 gap-x-8 px-4 py-3 text-sm md:grid-cols-2">
          {[
            ["Type", asset.assetType],
            ["Status", asset.status],
            ["Manufacturer", asset.manufacturer],
            ["Model", asset.model],
            ["OS", asset.operatingSystem],
            ["Location", asset.location],
            ["Serial", asset.serialNumber],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 py-1.5">
              <dt className="font-semibold text-slate-600">{label}</dt>
              <dd className={label === "Type" || label === "Status" ? "capitalize" : ""}>{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </div>

      {asset.tickets.length > 0 && (
        <div className="rounded-[4px] border border-slate-200">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Related tickets</h2>
          <div className="py-1">
            {asset.tickets.map((t) => (
              <Link key={t.id} href={`/app/tickets/${t.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-100">
                <span className="w-24 shrink-0 text-sm text-ourcloud-700">{t.ticketNumber}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-900">{t.subject}</span>
                <Badge color={t.status.color}>{t.status.name}</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
