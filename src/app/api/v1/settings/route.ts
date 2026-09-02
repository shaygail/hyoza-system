import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { getTenantSettings, updateTenantSettings } from "@/domain/settings";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.settings");

  const settings = await getTenantSettings(session.user.tenantId);
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.settings");

  const body = await request.json();
  const settings = await updateTenantSettings(session.user.tenantId, body);
  return NextResponse.json(settings);
}
