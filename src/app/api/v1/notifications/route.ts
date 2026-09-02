import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listNotifications, markNotificationRead } from "@/domain/notifications";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const unreadOnly = new URL(request.url).searchParams.get("unread") === "true";
  const notifications = await listNotifications(session.user.id, unreadOnly);
  return NextResponse.json(notifications);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (body.id) {
    await markNotificationRead(session.user.id, body.id);
  }
  return NextResponse.json({ ok: true });
}
