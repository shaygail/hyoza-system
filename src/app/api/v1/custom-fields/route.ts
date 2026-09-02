import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { listCustomFields, createCustomField } from "@/domain/custom-fields";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fields = await listCustomFields(session.user.tenantId);
  return NextResponse.json(fields);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.settings");

  const body = await request.json();
  const field = await createCustomField(session.user.tenantId, body);
  return NextResponse.json(field, { status: 201 });
}
