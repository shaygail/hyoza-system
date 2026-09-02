import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateUserRoles, updateUserStatus } from "@/domain/users";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  try {
    if (body.roleIds) {
      const user = await updateUserRoles(
        session.user.tenantId,
        id,
        body.roleIds,
        session.user.id
      );
      return NextResponse.json(user);
    }
    if (typeof body.isActive === "boolean") {
      const user = await updateUserStatus(
        session.user.tenantId,
        id,
        body.isActive,
        session.user.id
      );
      return NextResponse.json(user);
    }
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 });
  }
}
