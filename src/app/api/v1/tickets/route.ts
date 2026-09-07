import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listTickets } from "@/domain/tickets";
import { requirePermission } from "@/lib/permissions";
import type { TicketView } from "@/domain/tickets";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await requirePermission(session.user.id, "tickets.view");

  const { searchParams } = new URL(request.url);
  const view = (searchParams.get("view") || "all") as TicketView;
  const { getUserSecurityLevel } = await import("@/domain/security");
  const level = await getUserSecurityLevel(session.user.id);

  const tickets = await listTickets(session.user.tenantId, view, session.user.id, {
    maxSecurityLevel: level,
  });
  return NextResponse.json(tickets);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await requirePermission(session.user.id, "tickets.create");

  const body = await request.json();
  const { createTicket } = await import("@/domain/tickets");

  try {
    const ticket = await createTicket({
      tenantId: session.user.tenantId,
      createdById: session.user.id,
      subject: body.subject,
      description: body.description,
      organisationId: body.organisationId,
      contactId: body.contactId,
      assigneeId: body.assigneeId,
      teamId: body.teamId,
      priorityId: body.priorityId,
      ticketTypeId: body.ticketTypeId,
      source: "agent",
    });
    return NextResponse.json(ticket, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
