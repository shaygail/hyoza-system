import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission, hasPermission } from "@/lib/permissions";
import { listServiceAgreements, createServiceAgreement } from "@/domain/service-agreements";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed =
    (await hasPermission(session.user.id, "contracts.view")) ||
    (await hasPermission(session.user.id, "admin.settings"));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const agreements = await listServiceAgreements(session.user.tenantId);
  return NextResponse.json(agreements);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "contracts.edit");

  const body = await request.json();
  const agreement = await createServiceAgreement(session.user.tenantId, body);
  return NextResponse.json(agreement, { status: 201 });
}
