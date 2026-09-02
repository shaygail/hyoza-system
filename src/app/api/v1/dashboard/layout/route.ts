import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardLayout, saveDashboardLayout, type DashboardWidgetId } from "@/domain/dashboard";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const layout = await getDashboardLayout(session.user.id);
  return NextResponse.json({ layout });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  await saveDashboardLayout(session.user.id, body.layout as DashboardWidgetId[]);
  return NextResponse.json({ ok: true });
}
