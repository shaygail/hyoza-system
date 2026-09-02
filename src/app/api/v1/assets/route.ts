import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listAssets, createAsset } from "@/domain/assets";
import { requirePermission } from "@/lib/permissions";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "customers.view");

  const orgId = new URL(request.url).searchParams.get("organisationId") ?? undefined;
  const assets = await listAssets(session.user.tenantId, orgId);
  return NextResponse.json(assets);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "customers.edit");

  const body = await request.json();
  const asset = await createAsset(session.user.tenantId, body);
  return NextResponse.json(asset, { status: 201 });
}
