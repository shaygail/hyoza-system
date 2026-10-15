"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";

interface Entry {
  id: string;
  durationMinutes: number;
  isBillable: boolean;
  status: string;
  createdAt: string;
  notes: string | null;
  ticket: { id: string; ticketNumber: string; subject: string };
  user: { name: string };
  workType: { name: string } | null;
  organisation: { name: string } | null;
  contract: { name: string } | null;
}

export function TimeEntriesClient({
  entries,
  canApprove,
}: {
  entries: Entry[];
  canApprove: boolean;
}) {
  const router = useRouter();
  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
  const billableMinutes = entries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.durationMinutes, 0);
  const pending = entries.filter((e) => e.status === "submitted");

  async function setStatus(entryId: string, action: "approve" | "reject") {
    await fetch("/api/v1/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, entryId }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Time tracking" description="Logged work across all tickets." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total Time</p>
          <p className="text-2xl font-semibold text-ourcloud-700">{Math.round((totalMinutes / 60) * 10) / 10}h</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Billable</p>
          <p className="text-2xl font-semibold text-green-600">{Math.round((billableMinutes / 60) * 10) / 10}h</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Entries</p>
          <p className="text-2xl font-semibold text-slate-700">{entries.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Pending approval</p>
          <p className="text-2xl font-semibold text-amber-600">{pending.length}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-slate-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Ticket</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Technician</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Duration</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Work Type</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Contract</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Status</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Date</th>
              {canApprove && <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={canApprove ? 8 : 7} className="px-4 py-8 text-center text-slate-500">
                  No time entries yet. Log time from a ticket detail page.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2.5">
                    <Link href={`/app/tickets/${e.ticket.id}`} className="font-mono text-ourcloud-600 hover:underline">
                      {e.ticket.ticketNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{e.user.name}</td>
                  <td className="px-3 py-2.5">{e.durationMinutes}m</td>
                  <td className="px-3 py-2.5">{e.workType?.name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-slate-500">{e.contract?.name ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <Badge
                      color={
                        e.status === "approved" ? "#22c55e" : e.status === "rejected" ? "#ef4444" : "#f59e0b"
                      }
                    >
                      {e.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">{formatDate(e.createdAt)}</td>
                  {canApprove && (
                    <td className="px-3 py-2.5">
                      {e.status === "submitted" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="secondary" onClick={() => setStatus(e.id, "approve")}>
                            Approve
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setStatus(e.id, "reject")}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
