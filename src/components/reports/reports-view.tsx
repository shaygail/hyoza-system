"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Download, BarChart3, FileText } from "lucide-react";

interface VolumeReport {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
}

interface SlaReport {
  met: number;
  breached: number;
  pending: number;
  complianceRate: number;
}

interface MonthlyAccount {
  organisationId: string;
  name: string;
  accountCode: string | null;
  contract: {
    id: string;
    name: string;
    type: string;
    monthlyMinutes: number | null;
    currency: string;
  } | null;
  ticketsCreated: number;
  ticketsResolved: number;
  totalMinutes: number;
  billableMinutes: number;
  approvedMinutes: number;
  nonBillableMinutes: number;
  allowanceMinutes: number | null;
  remainingMinutes: number | null;
  overageMinutes: number;
  byUser: Record<string, number>;
  byWorkType: Record<string, number>;
  invoiceCount: number;
  invoiceTotal: number;
  currency: string;
}

interface MonthlyReport {
  yearMonth: string;
  label: string;
  totals: {
    accounts: number;
    ticketsCreated: number;
    ticketsResolved: number;
    totalMinutes: number;
    billableMinutes: number;
    approvedMinutes: number;
    invoiceTotal: number;
  };
  accounts: MonthlyAccount[];
}

interface YearlyReport {
  year: number;
  label: string;
  totals: {
    accounts: number;
    ticketsCreated: number;
    ticketsResolved: number;
    totalMinutes: number;
    billableMinutes: number;
    approvedMinutes: number;
    invoiceTotal: number;
  };
  accounts: {
    organisationId: string;
    name: string;
    accountCode: string | null;
    monthsActive: number;
    ticketsCreated: number;
    ticketsResolved: number;
    totalMinutes: number;
    billableMinutes: number;
    approvedMinutes: number;
    invoiceCount: number;
    invoiceTotal: number;
    currency: string;
  }[];
  byMonth: { yearMonth: string; label: string; totals: MonthlyReport["totals"] }[];
}

interface OrgOption {
  id: string;
  name: string;
}

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function hours(minutes: number) {
  return Math.round((minutes / 60) * 10) / 10;
}

export function ReportsClient() {
  const [tab, setTab] = useState<"overview" | "monthly" | "yearly">("monthly");
  const [volume, setVolume] = useState<VolumeReport | null>(null);
  const [sla, setSla] = useState<SlaReport | null>(null);
  const [timeData, setTimeData] = useState<{ totalMinutes: number; byUser: Record<string, number> } | null>(null);
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null);
  const [yearly, setYearly] = useState<YearlyReport | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [month, setMonth] = useState(currentYearMonth());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [organisationId, setOrganisationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadOverview();
    fetch("/api/v1/organisations")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setOrgs(Array.isArray(data) ? data.map((o: OrgOption) => ({ id: o.id, name: o.name })) : []))
      .catch(() => setOrgs([]));
  }, []);

  useEffect(() => {
    if (tab === "monthly") loadMonthly();
    if (tab === "yearly") loadYearly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, month, year, organisationId]);

  async function loadOverview() {
    setLoading(true);
    const [vRes, sRes, tRes] = await Promise.all([
      fetch("/api/v1/reports?type=volume"),
      fetch("/api/v1/reports?type=sla"),
      fetch("/api/v1/reports?type=time"),
    ]);
    if (vRes.ok) setVolume(await vRes.json());
    if (sRes.ok) setSla(await sRes.json());
    if (tRes.ok) setTimeData(await tRes.json());
    setLoading(false);
  }

  async function loadMonthly() {
    setMonthlyLoading(true);
    setError("");
    const params = new URLSearchParams({ type: "monthly", month });
    if (organisationId) params.set("organisationId", organisationId);
    const res = await fetch(`/api/v1/reports?${params}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Unable to load monthly report");
      setMonthly(null);
    } else {
      setMonthly(data);
    }
    setMonthlyLoading(false);
  }

  async function loadYearly() {
    setYearlyLoading(true);
    setError("");
    const params = new URLSearchParams({ type: "yearly", year });
    if (organisationId) params.set("organisationId", organisationId);
    const res = await fetch(`/api/v1/reports?${params}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Unable to load yearly report");
      setYearly(null);
    } else {
      setYearly(data);
    }
    setYearlyLoading(false);
  }

  const exportHref = useMemo(() => {
    const params = new URLSearchParams({ type: "monthly-export", month });
    if (organisationId) params.set("organisationId", organisationId);
    return `/api/v1/reports?${params}`;
  }, [month, organisationId]);

  const yearlyExportHref = useMemo(() => {
    const params = new URLSearchParams({ type: "yearly-export", year });
    if (organisationId) params.set("organisationId", organisationId);
    return `/api/v1/reports?${params}`;
  }, [year, organisationId]);

  function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
      </div>
    );
  }

  function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-medium text-slate-900">{title}</h3>
        <div className="mt-3 space-y-2">
          {entries.length === 0 ? (
            <p className="text-sm text-slate-400">No data</p>
          ) : (
            entries.map(([key, count]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-slate-600">{key}</span>
                <span className="font-medium">{typeof count === "number" && title.includes("Time") ? `${hours(count)}h` : count}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Monthly account summaries, ticket volume, SLA, and time</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setTab("monthly")}
            className={`rounded-md px-3 py-1.5 text-sm ${tab === "monthly" ? "bg-ourcloud-50 text-ourcloud-700 font-medium" : "text-slate-500"}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setTab("yearly")}
            className={`rounded-md px-3 py-1.5 text-sm ${tab === "yearly" ? "bg-ourcloud-50 text-ourcloud-700 font-medium" : "text-slate-500"}`}
          >
            Yearly
          </button>
          <button
            type="button"
            onClick={() => setTab("overview")}
            className={`rounded-md px-3 py-1.5 text-sm ${tab === "overview" ? "bg-ourcloud-50 text-ourcloud-700 font-medium" : "text-slate-500"}`}
          >
            Overview
          </button>
        </div>
      </div>

      {tab === "monthly" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Account</label>
              <select
                value={organisationId}
                onChange={(e) => setOrganisationId(e.target.value)}
                className="min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">All accounts with activity</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <a href={exportHref}>
              <Button variant="secondary" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </a>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {monthlyLoading && <p className="text-sm text-slate-500">Loading monthly report...</p>}

          {monthly && !monthlyLoading && (
            <>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FileText className="h-4 w-4" />
                <span className="font-medium">{monthly.label}</span>
                <span>· {monthly.totals.accounts} account{monthly.totals.accounts === 1 ? "" : "s"}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Tickets created" value={monthly.totals.ticketsCreated} />
                <StatCard label="Tickets resolved" value={monthly.totals.ticketsResolved} />
                <StatCard
                  label="Billable time"
                  value={`${hours(monthly.totals.billableMinutes)}h`}
                  sub={`${monthly.totals.billableMinutes} minutes`}
                />
                <StatCard
                  label="Invoice total"
                  value={monthly.totals.invoiceTotal.toFixed(2)}
                  sub="Non-void invoices created this month"
                />
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Account</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Tickets</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Time</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Contract usage</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Invoices</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthly.accounts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          No activity for this month.
                        </td>
                      </tr>
                    ) : (
                      monthly.accounts.map((a) => (
                        <Fragment key={a.organisationId}>
                          <tr
                            className="hover:bg-slate-50 cursor-pointer"
                            onClick={() =>
                              setExpandedId(expandedId === a.organisationId ? null : a.organisationId)
                            }
                          >
                            <td className="px-4 py-3">
                              <Link
                                href={`/app/customers/${a.organisationId}`}
                                className="font-medium text-ourcloud-600 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {a.name}
                              </Link>
                              {a.accountCode && (
                                <p className="text-xs text-slate-400">{a.accountCode}</p>
                              )}
                              {a.contract && (
                                <p className="text-xs text-slate-500">{a.contract.name}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {a.ticketsCreated} created
                              <br />
                              <span className="text-xs">{a.ticketsResolved} resolved</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {hours(a.totalMinutes)}h total
                              <br />
                              <span className="text-xs">{hours(a.billableMinutes)}h billable · {hours(a.approvedMinutes)}h approved</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {a.allowanceMinutes != null ? (
                                <>
                                  {a.billableMinutes}m / {a.allowanceMinutes}m
                                  <br />
                                  <span className="text-xs">
                                    {a.overageMinutes > 0
                                      ? `${a.overageMinutes}m overage`
                                      : `${a.remainingMinutes}m remaining`}
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-400">No allowance</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {a.invoiceCount > 0
                                ? `${a.currency} ${a.invoiceTotal.toFixed(2)}`
                                : "—"}
                            </td>
                          </tr>
                          {expandedId === a.organisationId && (
                            <tr className="bg-slate-50">
                              <td colSpan={5} className="px-4 py-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <p className="text-xs font-medium text-slate-500 mb-2">Time by agent</p>
                                    {Object.keys(a.byUser).length === 0 ? (
                                      <p className="text-xs text-slate-400">None</p>
                                    ) : (
                                      Object.entries(a.byUser)
                                        .sort((x, y) => y[1] - x[1])
                                        .map(([name, mins]) => (
                                          <div key={name} className="flex justify-between text-xs text-slate-600">
                                            <span>{name}</span>
                                            <span>{hours(mins)}h</span>
                                          </div>
                                        ))
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-slate-500 mb-2">Time by work type</p>
                                    {Object.keys(a.byWorkType).length === 0 ? (
                                      <p className="text-xs text-slate-400">None</p>
                                    ) : (
                                      Object.entries(a.byWorkType)
                                        .sort((x, y) => y[1] - x[1])
                                        .map(([name, mins]) => (
                                          <div key={name} className="flex justify-between text-xs text-slate-600">
                                            <span>{name}</span>
                                            <span>{hours(mins)}h</span>
                                          </div>
                                        ))
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "yearly" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Year</label>
              <input
                type="number"
                min={2020}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Account</label>
              <select
                value={organisationId}
                onChange={(e) => setOrganisationId(e.target.value)}
                className="min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">All accounts with activity</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <a href={yearlyExportHref}>
              <Button variant="secondary" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </a>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {yearlyLoading && <p className="text-sm text-slate-500">Loading yearly report...</p>}

          {yearly && !yearlyLoading && (
            <>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FileText className="h-4 w-4" />
                <span className="font-medium">{yearly.label}</span>
                <span>· {yearly.totals.accounts} account{yearly.totals.accounts === 1 ? "" : "s"}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Tickets created" value={yearly.totals.ticketsCreated} />
                <StatCard label="Tickets resolved" value={yearly.totals.ticketsResolved} />
                <StatCard
                  label="Billable time"
                  value={`${hours(yearly.totals.billableMinutes)}h`}
                  sub={`${yearly.totals.billableMinutes} minutes`}
                />
                <StatCard
                  label="Invoice total"
                  value={yearly.totals.invoiceTotal.toFixed(2)}
                />
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Account</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Months active</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Tickets</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Billable</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Invoices</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {yearly.accounts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          No activity for this year.
                        </td>
                      </tr>
                    ) : (
                      yearly.accounts.map((a) => (
                        <tr key={a.organisationId}>
                          <td className="px-4 py-3">
                            <Link href={`/app/customers/${a.organisationId}`} className="font-medium text-ourcloud-600 hover:underline">
                              {a.name}
                            </Link>
                            {a.accountCode && <p className="text-xs text-slate-400">{a.accountCode}</p>}
                          </td>
                          <td className="px-4 py-3">{a.monthsActive}</td>
                          <td className="px-4 py-3">{a.ticketsCreated} / {a.ticketsResolved}</td>
                          <td className="px-4 py-3">{hours(a.billableMinutes)}h</td>
                          <td className="px-4 py-3">
                            {a.invoiceCount > 0 ? `${a.currency} ${a.invoiceTotal.toFixed(2)}` : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {yearly.byMonth.some((m) => m.totals.totalMinutes > 0 || m.totals.ticketsCreated > 0) && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="font-medium text-slate-900 mb-3">Month-by-month</h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {yearly.byMonth
                      .filter((m) => m.totals.totalMinutes > 0 || m.totals.ticketsCreated > 0 || m.totals.invoiceTotal > 0)
                      .map((m) => (
                        <div key={m.yearMonth} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                          <p className="font-medium text-slate-800">{m.label}</p>
                          <p className="text-xs text-slate-500">
                            {hours(m.totals.billableMinutes)}h billable · {m.totals.ticketsCreated} tickets · inv {m.totals.invoiceTotal.toFixed(0)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "overview" && (
        loading ? (
          <p className="text-slate-500">Loading reports...</p>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-end">
              <a href="/api/v1/reports?type=export">
                <Button variant="secondary">
                  <Download className="mr-2 h-4 w-4" />
                  Export tickets CSV
                </Button>
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Tickets" value={volume?.total ?? 0} />
              <StatCard label="SLA Compliance" value={`${sla?.complianceRate ?? 0}%`} sub={`${sla?.met ?? 0} met, ${sla?.breached ?? 0} breached`} />
              <StatCard label="SLA Pending" value={sla?.pending ?? 0} />
              <StatCard label="Time Logged" value={`${Math.round((timeData?.totalMinutes ?? 0) / 60)}h`} sub={`${timeData?.totalMinutes ?? 0} minutes`} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {volume && <Breakdown title="By Status" data={volume.byStatus} />}
              {volume && <Breakdown title="By Priority" data={volume.byPriority} />}
              {volume && <Breakdown title="By Type" data={volume.byType} />}
            </div>

            {timeData && Object.keys(timeData.byUser).length > 0 && (
              <Breakdown title="Time by Agent" data={timeData.byUser} />
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <BarChart3 className="mb-2 h-5 w-5 text-slate-400" />
              Overview reflects all-time ticket stats. Use the Monthly accounts tab for period reports.
            </div>
          </div>
        )
      )}
    </div>
  );
}
