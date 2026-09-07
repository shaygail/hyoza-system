import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listTimeEntries, createTimeEntry, approveTimeEntry, rejectTimeEntry } from "@/domain/time-entries";
import { prisma } from "@/lib/prisma";
import { requirePermission, hasPermission } from "@/lib/permissions";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const entries = await listTimeEntries(session.user.tenantId, {
    ticketId: searchParams.get("ticketId") ?? undefined,
    userId: searchParams.get("userId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    contractId: searchParams.get("contractId") ?? undefined,
  });
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  try {
    if (body.action === "approve") {
      const canApprove =
        (await hasPermission(session.user.id, "billing.edit")) ||
        (await hasPermission(session.user.id, "tickets.view_all"));
      if (!canApprove) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const entry = await approveTimeEntry(session.user.tenantId, body.entryId, session.user.id);
      return NextResponse.json(entry);
    }
    if (body.action === "reject") {
      const canApprove =
        (await hasPermission(session.user.id, "billing.edit")) ||
        (await hasPermission(session.user.id, "tickets.view_all"));
      if (!canApprove) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const entry = await rejectTimeEntry(session.user.tenantId, body.entryId, session.user.id);
      return NextResponse.json(entry);
    }

    await requirePermission(session.user.id, "tickets.edit");
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
      contractId: body.contractId,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
