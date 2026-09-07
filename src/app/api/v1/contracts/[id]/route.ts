import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { getContract, updateContract, getContractUsage } from "@/domain/contracts";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "contracts.view");

  const { id } = await params;
  const url = new URL(_request.url);
  if (url.searchParams.get("usage") === "1") {
    const usage = await getContractUsage(session.user.tenantId, id);
    if (!usage) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(usage);
  }

  const contract = await getContract(session.user.tenantId, id);
  if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(contract);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "contracts.edit");

  const { id } = await params;
  const body = await request.json();
  try {
    const contract = await updateContract(session.user.tenantId, id, body);
    return NextResponse.json(contract);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
