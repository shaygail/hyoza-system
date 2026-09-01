import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user) return null;

  const organisations = await prisma.organisation.findMany({
    where: { tenantId: session.user.tenantId },
    include: { _count: { select: { tickets: true, contacts: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Organisation</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Account Code</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Contacts</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Tickets</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {organisations.map((org) => (
              <tr key={org.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/app/customers/${org.id}`} className="font-medium text-ourcloud-600 hover:underline">
                    {org.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{org.accountCode ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{org._count.contacts}</td>
                <td className="px-4 py-3 text-slate-600">{org._count.tickets}</td>
                <td className="px-4 py-3 capitalize text-slate-600">{org.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
