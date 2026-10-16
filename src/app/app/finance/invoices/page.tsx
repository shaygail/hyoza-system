import Link from "next/link";
import { auth } from "@/lib/auth";
import { listInvoices } from "@/domain/billing";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDay, formatMoney, invoiceStatusColor } from "@/components/finance/format";

const tabs = [
  { key: "", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "approved", label: "Approved" },
  { key: "void", label: "Void" },
];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { status = "" } = await searchParams;
  const all = await listInvoices(session.user.tenantId);
  const invoices = status ? all.filter((i) => i.status === status) : all;
  const counts = Object.fromEntries(tabs.map((t) => [t.key, t.key ? all.filter((i) => i.status === t.key).length : all.length]));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoices"
        projectCrumbs={false}
        breadcrumbs={[{ label: "Finance", href: "/app/finance" }]}
        description="Drafts are reviewed and approved here, then sent to Xero."
      />

      <nav className="flex gap-1 border-b-2 border-slate-200 text-sm">
        {tabs.map((t) => {
          const active = t.key === status;
          return (
            <Link
              key={t.key || "all"}
              href={t.key ? `/app/finance/invoices?status=${t.key}` : "/app/finance/invoices"}
              className={`-mb-0.5 border-b-2 px-2 pb-2 pt-1 font-medium ${
                active
                  ? "border-ourcloud-600 text-ourcloud-700"
                  : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {t.label} <span className="ml-0.5 text-slate-500">{counts[t.key]}</span>
            </Link>
          );
        })}
      </nav>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 text-left text-xs font-semibold text-slate-500">
              <th className="px-2 py-2">Invoice</th>
              <th className="px-2 py-2">Account</th>
              <th className="px-2 py-2">Period</th>
              <th className="px-2 py-2">Created</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Xero</th>
              <th className="px-2 py-2 text-right">Total (incl. GST)</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-10 text-center text-slate-500">
                  No invoices here yet. Create drafts from the billing review.
                </td>
              </tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id} className="h-10 border-b border-slate-200 hover:bg-slate-100">
                <td className="px-2">
                  <Link href={`/app/finance/invoices/${inv.id}`} className="font-medium text-ourcloud-700 hover:underline">
                    {inv.invoiceNumber}
                  </Link>
                </td>
                <td className="px-2 text-slate-900">{inv.organisation.name}</td>
                <td className="px-2 text-slate-600">{inv.billingPeriod?.label ?? "—"}</td>
                <td className="whitespace-nowrap px-2 text-slate-600">{formatDay(inv.createdAt)}</td>
                <td className="px-2">
                  <Badge color={invoiceStatusColor[inv.status]}>{inv.status}</Badge>
                </td>
                <td className="px-2 text-slate-600">{inv.xeroInvoiceId ? "Sent" : "—"}</td>
                <td className="whitespace-nowrap px-2 text-right font-medium text-slate-900">
                  {formatMoney(inv.total, inv.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
