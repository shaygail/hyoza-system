import { Suspense } from "react";
import Link from "next/link";
import { TicketSearch } from "@/components/tickets/ticket-search";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const views = [
  { key: "all", label: "All" },
  { key: "my", label: "My" },
  { key: "unassigned", label: "Unassigned" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "waiting", label: "Waiting" },
  { key: "resolved", label: "Resolved" },
];

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params.view ?? "all";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Tickets</h1>
        <Link href="/app/tickets/new">
          <Button><Plus className="mr-2 h-4 w-4" />New Ticket</Button>
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {views.map((v) => (
          <a
            key={v.key}
            href={`/app/tickets?view=${v.key}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === v.key ? "bg-ourcloud-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {v.label}
          </a>
        ))}
      </div>
      <Suspense fallback={<p>Loading...</p>}>
        <TicketSearch initialView={view} />
      </Suspense>
    </div>
  );
}
