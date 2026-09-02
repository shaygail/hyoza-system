import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { toggleAutomationRule } from "@/domain/settings";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.settings");

  const { id } = await params;
  const body = await request.json();
  await toggleAutomationRule(session.user.tenantId, id, body.isActive);
  return NextResponse.json({ ok: true });
}
