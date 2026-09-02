import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBoardData, moveTicketOnBoard } from "@/domain/board";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "tickets.view");

  const board = await getBoardData(session.user.tenantId);
  return NextResponse.json(board);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "tickets.edit");

  const body = await request.json();
  try {
    const ticket = await moveTicketOnBoard(
      session.user.tenantId,
      body.ticketId,
      body.toStatusId,
      session.user.id
    );
    return NextResponse.json(ticket);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
