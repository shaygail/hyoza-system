import Link from "next/link";
import { auth } from "@/lib/auth";
import { getFinanceReport } from "@/domain/finance";
import { PageHeader } from "@/components/ui/page-header";
import { formatMinutes, formatMoney } from "@/components/finance/format";
import { MonthlyInvoicedChart } from "@/components/finance/monthly-chart";

export default async function FinanceReportsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const report = await getFinanceReport(session.user.tenantId);
  const money = (n: number) => formatMoney(n, report.currency);

  const tiles = [
    {
      label: "Unbilled work (est.)",
      value: money(report.unbilled.value),
      hint: `${formatMinutes(report.unbilled.minutes)} across ${report.unbilled.accounts} ${
        report.unbilled.accounts === 1 ? "account" : "accounts"
      }`,
      href: "/app/finance",
    },
    {
      label: "Draft invoices",
      value: money(report.drafts.value),
      hint: `${report.drafts.count} waiting for approval`,
      href: "/app/finance/invoices?status=draft",
    },
    { label: "Invoiced this month", value: money(report.invoicedThisMonth), hint: "Approved, excl. GST" },
    { label: "Invoiced year to date", value: money(report.invoicedYtd), hint: "Approved, excl. GST" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance reports"
        projectCrumbs={false}
        breadcrumbs={[{ label: "Finance", href: "/app/finance" }]}
        description="Amounts exclude GST. Payments and receivables live in Xero."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => {
          const body = (
            <>
              <p className="text-sm font-semibold text-slate-600">{t.label}</p>
              <p className="mt-1 text-2xl font-medium text-slate-900">{t.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t.hint}</p>
            </>
          );
          return t.href ? (
            <Link key={t.label} href={t.href} className="rounded-[4px] border border-slate-200 p-4 hover:bg-slate-50">
              {body}
            </Link>
          ) : (
            <div key={t.label} className="rounded-[4px] border border-slate-200 p-4">
              {body}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-[4px] border border-slate-200">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
            Invoiced per month <span className="font-normal text-slate-500">· last 6 months</span>
          </h2>
          <div className="p-4">
            <MonthlyInvoicedChart months={report.months} currency={report.currency} />
          </div>
        </section>

        <section className="rounded-[4px] border border-slate-200">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
            Revenue by account <span className="font-normal text-slate-500">· year to date</span>
          </h2>
          {report.revenueByAccount.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No approved invoices this year yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200 text-left text-xs font-semibold text-slate-500">
                  <th className="px-4 py-2">Account</th>
                  <th className="px-2 py-2 text-right">Invoices</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {report.revenueByAccount.map((a) => (
                  <tr key={a.id} className="border-b border-slate-200">
                    <td className="px-4 py-2">
                      <Link href={`/app/customers/${a.id}`} className="text-ourcloud-700 hover:underline">
                        {a.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-right text-slate-600">{a.invoices}</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900">{money(a.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-[4px] border border-slate-200">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
            Contract utilisation <span className="font-normal text-slate-500">· this month</span>
          </h2>
          <div className="divide-y divide-slate-200">
            {report.utilisation.length === 0 && (
              <p className="px-4 py-6 text-sm text-slate-500">No active contracts with an hours allowance.</p>
            )}
            {report.utilisation.map((u) => {
              const pct = Math.round((u.usedMinutes / u.allowanceMinutes) * 100);
              const state =
                pct > 100
                  ? { label: "Over allowance", bar: "bg-[#c9372c]", text: "text-[#ae2e24]" }
                  : pct >= 80
                    ? { label: "Nearly used", bar: "bg-[#e2a203]", text: "text-[#7f5f01]" }
                    : { label: "On track", bar: "bg-[#1f845a]", text: "text-[#216e4e]" };
              return (
                <div key={u.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-slate-900">
                      {u.organisation} <span className="text-slate-500">· {u.name}</span>
                    </span>
                    <span className="shrink-0 text-slate-600">
                      {formatMinutes(u.usedMinutes)} / {formatMinutes(u.allowanceMinutes)}{" "}
                      <span className={`font-semibold ${state.text}`}>
                        {pct}% · {state.label}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full rounded-full ${state.bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[4px] border border-slate-200">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
            Approval pipeline &amp; non-billable time
          </h2>
          <dl className="space-y-2 px-4 py-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Time awaiting a lead&apos;s approval</dt>
              <dd className="font-medium text-slate-900">
                {report.awaitingApproval.count} entries · {formatMinutes(report.awaitingApproval.minutes)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Non-billable or written-off time this month</dt>
              <dd className="font-medium text-slate-900">
                {report.nonBillableThisMonth.entries} entries · {formatMinutes(report.nonBillableThisMonth.minutes)}
              </dd>
            </div>
          </dl>
          <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            Write-offs are recorded in the security audit log with the reason given.
          </p>
        </section>
      </div>
    </div>
  );
}
