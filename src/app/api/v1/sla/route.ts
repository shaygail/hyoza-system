import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { checkSlaEscalations } from "@/domain/sla-engine";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.settings");

  const calendars = await prisma.businessCalendar.findMany({
    where: { tenantId: session.user.tenantId },
  });
  const policies = await prisma.slaPolicy.findMany({
    where: { tenantId: session.user.tenantId },
    include: { priority: true, businessCalendar: true },
  });

  return NextResponse.json({ calendars, policies });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.settings");

  const body = await request.json();

  if (body.action === "check_escalations") {
    const escalated = await checkSlaEscalations(session.user.tenantId);
    return NextResponse.json({ escalated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
