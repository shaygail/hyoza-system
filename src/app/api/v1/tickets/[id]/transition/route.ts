import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { transitionTicket } from "@/domain/tickets";
import { requirePermission } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await requirePermission(session.user.id, "tickets.edit");

  const { id } = await params;
  const body = await request.json();

  try {
    const ticket = await transitionTicket(
      session.user.tenantId,
      id,
      session.user.id,
      body.transitionId,
      body.fields
    );
    return NextResponse.json(ticket);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
