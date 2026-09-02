import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { listWorkflows } from "@/domain/workflows";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.settings");

  const workflows = await listWorkflows(session.user.tenantId);
  return NextResponse.json(workflows);
}
