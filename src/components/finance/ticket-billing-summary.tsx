import Link from "next/link";
import { Lock } from "lucide-react";
import type { getTicketBillingSummary } from "@/domain/finance";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { PriorityLabel, StatusLozenge, TypeIcon } from "@/components/ui/jira";
import { formatDay, formatMinutes, invoiceStatusColor } from "@/components/finance/format";

type Summary = NonNullable<Awaited<ReturnType<typeof getTicketBillingSummary>>>;

/** Read-only ticket view for finance: what was done and billed, without the conversation or internal notes. */
export function TicketBillingSummary({ ticket }: { ticket: Summary }) {
  const billable = ticket.timeEntries.filter((e) => e.isBillable && e.status === "approved");
  const billableMinutes = billable.reduce((s, e) => s + e.durationMinutes, 0);
  const totalMinutes = ticket.timeEntries.reduce((s, e) => s + e.durationMinutes, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        projectCrumbs={false}
        breadcrumbs={[{ label: "Finance", href: "/app/finance" }, { label: ticket.ticketNumber }]}
        title={
          <span className="flex items-center gap-2">
            <TypeIcon name={ticket.ticketType.name} className="h-5 w-5" />
            {ticket.subject}
          </span>
        }
      />
      <p className="flex items-center gap-2 rounded-[3px] bg-slate-100 px-3 py-2 text-sm text-slate-600">
        <Lock className="h-4 w-4 shrink-0" />
        Billing view — the customer conversation and internal notes are only visible to the service desk.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[4px] border border-slate-200">
          <h2 className="flex items-baseline justify-between border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
            Time logged
            <span className="font-normal text-slate-600">
              {formatMinutes(billableMinutes)} billable of {formatMinutes(totalMinutes)}
            </span>
          </h2>
          {ticket.timeEntries.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No time has been logged on this ticket.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-left text-xs font-semibold text-slate-500">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-2 py-2">Technician</th>
                    <th className="px-2 py-2">Work</th>
                    <th className="px-2 py-2 text-right">Time</th>
                    <th className="px-2 py-2">Billing</th>
                    <th className="px-4 py-2">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {ticket.timeEntries.map((e) => {
                    const invoice = e.billingPeriod?.invoices[0];
                    return (
                      <tr key={e.id} className="border-b border-slate-200 align-top">
                        <td className="whitespace-nowrap px-4 py-2 text-slate-600">{formatDay(e.createdAt)}</td>
                        <td className="whitespace-nowrap px-2 py-2 text-slate-900">{e.user.name}</td>
                        <td className="px-2 py-2 text-slate-600">
                          {e.workType?.name ?? "—"}
                          {e.notes && <p className="max-w-[260px] text-xs text-slate-500">{e.notes}</p>}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right font-medium text-slate-900">
                          {formatMinutes(e.durationMinutes)}
                        </td>
                        <td className="px-2 py-2">
                          {e.status !== "approved" ? (
                            <Badge color="#f59e0b">{e.status === "submitted" ? "Awaiting approval" : e.status}</Badge>
                          ) : e.isBillable ? (
                            <Badge color="#3b82f6">Billable</Badge>
                          ) : (
                            <Badge color="#6b7280">Non-billable</Badge>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2">
                          {invoice ? (
                            <Link href={`/app/finance/invoices/${invoice.id}`} className="text-ourcloud-700 hover:underline">
                              {invoice.invoiceNumber}
                            </Link>
                          ) : e.isBillable && e.status === "approved" ? (
                            <Link href="/app/finance" className="text-slate-600 hover:underline">
                              Ready to bill
                            </Link>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                          {invoice && (
                            <Badge color={invoiceStatusColor[invoice.status]} className="ml-2">
                              {invoice.status}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="rounded-[4px] border border-slate-200">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Details</h2>
          <dl className="space-y-1 px-4 py-3 text-sm">
            {[
              ["Key", ticket.ticketNumber],
              [
                "Account",
                <Link key="a" href={`/app/customers/${ticket.organisation.id}`} className="text-ourcloud-700 hover:underline">
                  {ticket.organisation.name}
                </Link>,
              ],
              ["Reporter", ticket.contact?.name ?? "—"],
              ["Assignee", ticket.assignee?.name ?? "Unassigned"],
              ["Status", <StatusLozenge key="s" status={ticket.status} />],
              ["Priority", <PriorityLabel key="p" name={ticket.priority.name} />],
              ["Type", ticket.ticketType.name],
              ["Contract", ticket.timeEntries.find((e) => e.contract)?.contract?.name ?? "—"],
              ["Created", formatDay(ticket.createdAt)],
              ["Resolved", ticket.resolvedAt ? formatDay(ticket.resolvedAt) : "—"],
            ].map(([label, value]) => (
              <div key={String(label)} className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3 py-1">
                <dt className="font-semibold text-slate-600">{label}</dt>
                <dd className="min-w-0 text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </div>
  );
}
