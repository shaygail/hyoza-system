import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listQueues } from "@/domain/queues";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "tickets.view");

  const queues = await listQueues(session.user.tenantId, session.user.id);
  return NextResponse.json(queues);
}
