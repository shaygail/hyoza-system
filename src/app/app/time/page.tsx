import { auth } from "@/lib/auth";
import { listTimeEntries } from "@/domain/time-entries";
import { hasPermission } from "@/lib/permissions";
import { TimeEntriesClient } from "@/components/time/time-entries-client";

export default async function TimePage() {
  const session = await auth();
  if (!session?.user) return null;

  const entries = await listTimeEntries(session.user.tenantId);
  const canApprove =
    (await hasPermission(session.user.id, "billing.edit")) ||
    (await hasPermission(session.user.id, "tickets.view_all"));

  return (
    <TimeEntriesClient
      entries={entries.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      }))}
      canApprove={canApprove}
    />
  );
}
