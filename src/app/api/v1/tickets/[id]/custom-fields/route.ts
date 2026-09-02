import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { getTicketCustomFieldValues, setTicketCustomFieldValues } from "@/domain/custom-fields";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const values = await getTicketCustomFieldValues(id);
  return NextResponse.json(values);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "tickets.edit");

  const { id } = await params;
  const body = await request.json();
  await setTicketCustomFieldValues(id, body.values ?? {});
  const values = await getTicketCustomFieldValues(id);
  return NextResponse.json(values);
}
