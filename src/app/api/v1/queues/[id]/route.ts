import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQueueTickets, pinQueue, unpinQueue } from "@/domain/queues";
import { requirePermission } from "@/lib/permissions";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "tickets.view");

  const { id } = await params;
  const tickets = await getQueueTickets(session.user.tenantId, id, session.user.id);
  return NextResponse.json(tickets);
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await pinQueue(session.user.id, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await unpinQueue(session.user.id, id);
  return NextResponse.json({ ok: true });
}
