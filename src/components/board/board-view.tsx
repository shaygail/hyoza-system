"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  organisation: { name: string };
  assignee: { name: string } | null;
  priority: { name: string; color: string };
}

interface Column {
  id: string;
  name: string;
  code: string;
  color: string;
  tickets: Ticket[];
}

export function BoardView() {
  const router = useRouter();
  const [columns, setColumns] = useState<Column[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/board")
      .then((r) => r.json())
      .then((data) => setColumns(data.columns ?? []));
  }, []);

  async function handleDrop(toStatusId: string) {
    if (!dragging) return;
    const res = await fetch("/api/v1/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: dragging, toStatusId }),
    });
    if (res.ok) {
      const data = await fetch("/api/v1/board").then((r) => r.json());
      setColumns(data.columns ?? []);
    }
    setDragging(null);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div
          key={col.id}
          className="flex w-72 shrink-0 flex-col rounded-lg bg-slate-100"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(col.id)}
        >
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-sm font-semibold text-slate-700">{col.name}</span>
            </div>
            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">{col.tickets.length}</span>
          </div>
          <div className="flex flex-1 flex-col gap-2 p-2 min-h-[200px]">
            {col.tickets.map((ticket) => (
              <div
                key={ticket.id}
                draggable
                onDragStart={() => setDragging(ticket.id)}
                onClick={() => router.push(`/app/tickets/${ticket.id}`)}
                className="cursor-pointer rounded-md border border-slate-200 bg-white p-3 shadow-sm hover:border-ourcloud-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-ourcloud-600">{ticket.ticketNumber}</span>
                  <Badge color={ticket.priority.color}>{ticket.priority.name}</Badge>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-900 line-clamp-2">{ticket.subject}</p>
                <p className="mt-2 text-xs text-slate-500">{ticket.organisation.name}</p>
                {ticket.assignee && (
                  <div className="mt-2 flex items-center gap-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ourcloud-100 text-[10px] font-medium text-ourcloud-700">
                      {ticket.assignee.name.charAt(0)}
                    </span>
                    <span className="text-xs text-slate-500">{ticket.assignee.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
