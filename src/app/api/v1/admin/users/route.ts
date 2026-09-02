import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listUsersForAdmin, listRoles } from "@/domain/users";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requirePermission(session.user.id, "admin.users");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, roles] = await Promise.all([
    listUsersForAdmin(session.user.tenantId),
    listRoles(session.user.tenantId),
  ]);

  return NextResponse.json({ users, roles });
}
