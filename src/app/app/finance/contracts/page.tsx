import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { listFinanceContracts } from "@/domain/finance";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { contractTypeLabel, formatDay, formatMinutes, formatMoney } from "@/components/finance/format";

const statusColor: Record<string, string> = {
  active: "#22c55e",
  draft: "#6b7280",
  expired: "#f59e0b",
  cancelled: "#ef4444",
};

export default async function FinanceContractsPage() {
  const session = await auth();
  if (!session?.user) return null;
  if (!(await hasPermission(session.user.id, "contracts.view"))) redirect("/app/finance");

  const [contracts, canEdit] = await Promise.all([
    listFinanceContracts(session.user.tenantId),
    hasPermission(session.user.id, "contracts.edit"),
  ]);
  const active = contracts.filter((c) => c.status === "active");
  const monthlyRecurring = active.reduce((s, c) => s + (c.contractType === "retainer" ? c.retainerAmount ?? 0 : 0), 0);
  const renewals = contracts.filter((c) => c.renewalDue);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts"
        projectCrumbs={false}
        breadcrumbs={[{ label: "Finance", href: "/app/finance" }]}
        description="What each customer is contracted for, and how much of this month's allowance they've used."
        actions={
          canEdit && (
            <Link href="/app/admin/contracts">
              <Button variant="secondary">Manage contracts</Button>
            </Link>
          )
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[4px] border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-600">Active contracts</p>
          <p className="mt-1 text-2xl font-medium text-slate-900">{active.length}</p>
        </div>
        <div className="rounded-[4px] border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-600">Monthly recurring (retainers)</p>
          <p className="mt-1 text-2xl font-medium text-slate-900">{formatMoney(monthlyRecurring)}</p>
        </div>
        <div className="rounded-[4px] border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-600">Renewals in the next 60 days</p>
          <p className={`mt-1 text-2xl font-medium ${renewals.length ? "text-[#c9372c]" : "text-slate-900"}`}>
            {renewals.length}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 text-left text-xs font-semibold text-slate-500">
              <th className="px-2 py-2">Account</th>
              <th className="px-2 py-2">Contract</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2 text-right">Monthly value</th>
              <th className="px-2 py-2">Allowance used (this month)</th>
              <th className="px-2 py-2 text-right">Overage rate</th>
              <th className="px-2 py-2">Term</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => {
              const pct = c.monthlyMinutes ? Math.round((c.usedMinutes / c.monthlyMinutes) * 100) : null;
              return (
                <tr key={c.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-2 py-2.5">
                    <Link href={`/app/customers/${c.organisation.id}`} className="text-ourcloud-700 hover:underline">
                      {c.organisation.name}
                    </Link>
                  </td>
                  <td className="px-2 py-2.5 text-slate-900">{c.name}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-slate-600">
                    {contractTypeLabel[c.contractType] ?? c.contractType}
                  </td>
                  <td className="px-2 py-2.5">
                    <Badge color={statusColor[c.status] ?? "#6b7280"}>{c.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right text-slate-900">
                    {c.retainerAmount != null ? formatMoney(c.retainerAmount, c.currency) : "—"}
                  </td>
                  <td className="px-2 py-2.5">
                    {c.monthlyMinutes ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${pct! > 100 ? "bg-[#c9372c]" : pct! >= 80 ? "bg-[#e2a203]" : "bg-[#1f845a]"}`}
                            style={{ width: `${Math.min(100, pct!)}%` }}
                          />
                        </div>
                        <span className="whitespace-nowrap text-slate-600">
                          {formatMinutes(c.usedMinutes)} / {formatMinutes(c.monthlyMinutes)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500">No allowance</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right text-slate-600">
                    {c.overageHourlyRate != null ? `${formatMoney(c.overageHourlyRate, c.currency)}/h` : "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-slate-600">
                    {formatDay(c.startDate)} – {c.endDate ? formatDay(c.endDate) : "ongoing"}
                    {c.renewalDue && <Badge color="#f59e0b" className="ml-2">Renewal due</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
