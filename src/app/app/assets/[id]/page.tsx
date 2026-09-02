import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAsset } from "@/domain/assets";
import { Badge } from "@/components/ui/badge";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const asset = await getAsset(session.user.tenantId, id);
  if (!asset) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/assets" className="text-sm text-ourcloud-600 hover:underline">← Assets</Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{asset.assetTag}</h1>
        <p className="text-slate-500">{asset.name} · {asset.organisation.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-6 text-sm md:grid-cols-4">
        <div><span className="text-slate-500">Type</span><p className="font-medium capitalize">{asset.assetType}</p></div>
        <div><span className="text-slate-500">Status</span><p className="font-medium capitalize">{asset.status}</p></div>
        <div><span className="text-slate-500">Manufacturer</span><p className="font-medium">{asset.manufacturer ?? "—"}</p></div>
        <div><span className="text-slate-500">Model</span><p className="font-medium">{asset.model ?? "—"}</p></div>
        <div><span className="text-slate-500">OS</span><p className="font-medium">{asset.operatingSystem ?? "—"}</p></div>
        <div><span className="text-slate-500">Location</span><p className="font-medium">{asset.location ?? "—"}</p></div>
        <div><span className="text-slate-500">Serial</span><p className="font-medium">{asset.serialNumber ?? "—"}</p></div>
      </div>

      {asset.tickets.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 font-medium">Related Tickets</div>
          <div className="divide-y divide-slate-100">
            {asset.tickets.map((t) => (
              <Link key={t.id} href={`/app/tickets/${t.id}`} className="block px-4 py-3 hover:bg-slate-50">
                <span className="font-mono text-xs text-slate-400">{t.ticketNumber}</span>
                <span className="ml-2"><Badge color={t.status.color}>{t.status.name}</Badge></span>
                <p className="mt-1 text-sm font-medium">{t.subject}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
