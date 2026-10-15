"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, PriorityIcon, TypeIcon } from "@/components/ui/jira";
import { useRouter } from "next/navigation";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  ticketType?: { name: string } | null;
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
    <div className="flex items-start gap-2 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div
          key={col.id}
          className={`flex w-[272px] shrink-0 flex-col rounded-[6px] bg-slate-100 transition-colors ${
            dragging ? "outline-dashed outline-1 outline-slate-300" : ""
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(col.id)}
        >
          <div className="flex items-center gap-1.5 px-3 pb-1 pt-3">
            <span className="truncate text-xs font-semibold uppercase text-slate-500">{col.name}</span>
            <span className="text-xs text-slate-500">{col.tickets.length}</span>
          </div>
          <div className="flex min-h-[200px] flex-1 flex-col gap-1 p-1">
            {col.tickets.map((ticket) => (
              <div
                key={ticket.id}
                draggable
                onDragStart={() => setDragging(ticket.id)}
                onDragEnd={() => setDragging(null)}
                onClick={() => router.push(`/app/tickets/${ticket.id}`)}
                className={`cursor-pointer rounded-[3px] bg-white p-3 shadow-card transition-colors hover:bg-slate-50 ${
                  dragging === ticket.id ? "opacity-50" : ""
                }`}
              >
                <p className="line-clamp-3 text-sm text-slate-900">{ticket.subject}</p>
                <p className="mt-1.5 truncate text-xs text-slate-500">{ticket.organisation.name}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <TypeIcon name={ticket.ticketType?.name} />
                  <span className="text-xs font-medium text-slate-600">{ticket.ticketNumber}</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <PriorityIcon name={ticket.priority.name} />
                    <Avatar name={ticket.assignee?.name} size={24} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
