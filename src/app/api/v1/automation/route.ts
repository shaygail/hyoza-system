import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { listAutomationRules, createAutomationRule } from "@/domain/automation";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.settings");

  const rules = await listAutomationRules(session.user.tenantId);
  return NextResponse.json(rules);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.settings");

  const body = await request.json();
  const rule = await createAutomationRule(session.user.tenantId, body);
  return NextResponse.json(rule, { status: 201 });
}
