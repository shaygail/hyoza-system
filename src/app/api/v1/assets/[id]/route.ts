import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAsset } from "@/domain/assets";
import { requirePermission } from "@/lib/permissions";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "customers.view");

  const { id } = await params;
  const asset = await getAsset(session.user.tenantId, id);
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(asset);
}
