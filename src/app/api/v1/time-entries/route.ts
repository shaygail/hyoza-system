import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listTimeEntries, createTimeEntry } from "@/domain/time-entries";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ticketId = new URL(request.url).searchParams.get("ticketId") ?? undefined;
  const entries = await listTimeEntries(session.user.tenantId, {
    ticketId,
    userId: new URL(request.url).searchParams.get("userId") ?? undefined,
  });
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const ticket = await prisma.ticket.findFirst({
    where: { id: body.ticketId, tenantId: session.user.tenantId },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const entry = await createTimeEntry({
    tenantId: session.user.tenantId,
    ticketId: body.ticketId,
    userId: session.user.id,
    organisationId: ticket.organisationId,
    durationMinutes: body.durationMinutes,
    workTypeId: body.workTypeId,
    isBillable: body.isBillable,
    notes: body.notes,
  });

  return NextResponse.json(entry, { status: 201 });
}
