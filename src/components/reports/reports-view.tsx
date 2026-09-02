"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, BarChart3 } from "lucide-react";

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

export function ReportsClient() {
  const [volume, setVolume] = useState<VolumeReport | null>(null);
  const [sla, setSla] = useState<SlaReport | null>(null);
  const [timeData, setTimeData] = useState<{ totalMinutes: number; byUser: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
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
          {entries.map(([key, count]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-slate-600">{key}</span>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return <p className="text-slate-500">Loading reports...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Ticket volume, SLA compliance, and time tracking</p>
        </div>
        <a href="/api/v1/reports?type=export">
          <Button variant="secondary">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
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
        Reports reflect all tickets in the system. Use Export CSV for detailed ticket data.
      </div>
    </div>
  );
}
