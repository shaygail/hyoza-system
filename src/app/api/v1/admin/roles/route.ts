import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { listRoles, listPermissions, createCustomRole, updateRolePermissions } from "@/domain/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.users");

  const [roles, permissions] = await Promise.all([
    listRoles(session.user.tenantId),
    listPermissions(),
  ]);
  return NextResponse.json({ roles, permissions });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.users");

  const body = await request.json();

  try {
    if (body.roleId && body.permissionKeys) {
      const role = await updateRolePermissions(
        session.user.tenantId,
        body.roleId,
        body.permissionKeys
      );
      return NextResponse.json(role);
    }

    const role = await createCustomRole(session.user.tenantId, body);
    return NextResponse.json(role, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
