import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import {
  listBrowseSchemes,
  upsertBrowseScheme,
  listSecurityAudits,
  updateRoleSecurityLevel,
} from "@/domain/security";
import { updateRolePermissions } from "@/domain/roles";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.users");

  const resource = new URL(request.url).searchParams.get("resource") ?? "schemes";
  if (resource === "audits") {
    return NextResponse.json(await listSecurityAudits(session.user.tenantId));
  }
  return NextResponse.json(await listBrowseSchemes(session.user.tenantId));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  try {
    if (body.action === "setSecurityLevel") {
      await requirePermission(session.user.id, "admin.security");
      const role = await updateRoleSecurityLevel(
        session.user.tenantId,
        body.roleId,
        Number(body.securityLevel),
        session.user.id
      );
      return NextResponse.json(role);
    }
    if (body.action === "setPermissions") {
      await requirePermission(session.user.id, "admin.security");
      const role = await updateRolePermissions(
        session.user.tenantId,
        body.roleId,
        body.permissionKeys,
        { allowSystem: true }
      );
      return NextResponse.json(role);
    }
    if (body.action === "upsertBrowseScheme") {
      await requirePermission(session.user.id, "admin.security");
      const scheme = await upsertBrowseScheme(session.user.tenantId, body, session.user.id);
      return NextResponse.json(scheme);
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const message = (e as Error).message;
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}
