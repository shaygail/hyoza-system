import { auth } from "@/lib/auth";
import { listTimeEntries } from "@/domain/time-entries";
import { formatDate } from "@/lib/utils";

export default async function TimePage() {
  const session = await auth();
  if (!session?.user) return null;

  const entries = await listTimeEntries(session.user.tenantId);

  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
  const billableMinutes = entries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.durationMinutes, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Time Entries</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total Time</p>
          <p className="text-2xl font-semibold text-ourcloud-700">{Math.round(totalMinutes / 60 * 10) / 10}h</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Billable</p>
          <p className="text-2xl font-semibold text-green-600">{Math.round(billableMinutes / 60 * 10) / 10}h</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Entries</p>
          <p className="text-2xl font-semibold text-slate-700">{entries.length}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Ticket</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Technician</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Duration</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Work Type</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Billable</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No time entries yet. Log time from a ticket detail page.</td></tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-mono text-ourcloud-600">{e.ticket.ticketNumber}</td>
                  <td className="px-4 py-3">{e.user.name}</td>
                  <td className="px-4 py-3">{e.durationMinutes}m</td>
                  <td className="px-4 py-3">{e.workType?.name ?? "—"}</td>
                  <td className="px-4 py-3">{e.isBillable ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(e.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
