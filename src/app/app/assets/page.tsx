import Link from "next/link";
import { auth } from "@/lib/auth";
import { listAssets } from "@/domain/assets";
import { PageHeader } from "@/components/ui/page-header";

export default async function AssetsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const assets = await listAssets(session.user.tenantId);

  return (
    <div className="space-y-4">
      <PageHeader title="Assets" description="Hardware and software tracked against customers." />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-slate-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Asset Tag</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Name</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Type</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Customer</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {assets.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5">
                  <Link href={`/app/assets/${a.id}`} className="font-mono text-ourcloud-600 hover:underline">
                    {a.assetTag}
                  </Link>
                </td>
                <td className="px-3 py-2.5 font-medium">{a.name}</td>
                <td className="px-3 py-2.5 capitalize text-slate-600">{a.assetType}</td>
                <td className="px-3 py-2.5 text-slate-600">{a.organisation.name}</td>
                <td className="px-3 py-2.5 capitalize text-slate-600">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
