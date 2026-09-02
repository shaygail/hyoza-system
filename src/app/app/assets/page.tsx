import Link from "next/link";
import { auth } from "@/lib/auth";
import { listAssets } from "@/domain/assets";

export default async function AssetsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const assets = await listAssets(session.user.tenantId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Assets</h1>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Asset Tag</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assets.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/app/assets/${a.id}`} className="font-mono text-ourcloud-600 hover:underline">
                    {a.assetTag}
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium">{a.name}</td>
                <td className="px-4 py-3 capitalize text-slate-600">{a.assetType}</td>
                <td className="px-4 py-3 text-slate-600">{a.organisation.name}</td>
                <td className="px-4 py-3 capitalize text-slate-600">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
