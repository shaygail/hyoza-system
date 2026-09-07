import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import {
  listRoles,
  listPermissions,
  createCustomRole,
  updateRolePermissions,
  setRoleCrmAccess,
} from "@/domain/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.users");

  const [roles, permissions] = await Promise.all([
    listRoles(session.user.tenantId),
    listPermissions(),
  ]);
  return NextResponse.json({
    roles,
    permissions,
    canGrantCrm: (session.user.permissions ?? []).includes("admin.grant_crm"),
    canManageSecurity: (session.user.permissions ?? []).includes("admin.security"),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  try {
    if (body.action === "setCrmAccess") {
      const role = await setRoleCrmAccess(
        session.user.tenantId,
        body.roleId,
        { view: Boolean(body.view), edit: Boolean(body.edit) },
        session.user.id
      );
      return NextResponse.json(role);
    }

    await requirePermission(session.user.id, "admin.users");

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
    const message = (e as Error).message;
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
