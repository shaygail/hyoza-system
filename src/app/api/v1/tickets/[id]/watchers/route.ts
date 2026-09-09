import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import {
  listTicketWatchers,
  tagTicketWatchers,
  removeTicketWatcher,
} from "@/domain/ticket-watchers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "tickets.view");

  const { id } = await params;
  const watchers = await listTicketWatchers(id);
  return NextResponse.json(watchers);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "tickets.edit");

  const { id } = await params;
  const body = await request.json();

  try {
    if (body.action === "remove") {
      const watchers = await removeTicketWatcher({
        tenantId: session.user.tenantId,
        ticketId: id,
        userId: body.userId,
        actorId: session.user.id,
      });
      return NextResponse.json(watchers);
    }

    const userIds = Array.isArray(body.userIds)
      ? body.userIds.filter((x: unknown) => typeof x === "string")
      : body.userId
        ? [body.userId]
        : [];

    const watchers = await tagTicketWatchers({
      tenantId: session.user.tenantId,
      ticketId: id,
      taggedById: session.user.id,
      userIds,
      reason: typeof body.reason === "string" ? body.reason : "escalation",
      notify: body.notify !== false,
    });
    return NextResponse.json(watchers, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
