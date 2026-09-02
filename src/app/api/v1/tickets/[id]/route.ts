import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTicket, updateTicket } from "@/domain/tickets";
import { requirePermission } from "@/lib/permissions";
import { serializeTicketForClient } from "@/lib/serialize-ticket";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requirePermission(session.user.id, "tickets.view");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const ticket = await getTicket(session.user.tenantId, id);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(serializeTicketForClient(ticket));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requirePermission(session.user.id, "tickets.edit");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  try {
    const ticket = await updateTicket(session.user.tenantId, id, session.user.id, body);
    return NextResponse.json(ticket);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
