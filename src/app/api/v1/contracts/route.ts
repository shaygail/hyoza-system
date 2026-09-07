import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { listContracts, createContract, listRateCards, createRateCard } from "@/domain/contracts";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "contracts.view");

  const { searchParams } = new URL(request.url);
  if (searchParams.get("rateCards") === "1") {
    const cards = await listRateCards(session.user.tenantId);
    return NextResponse.json(cards);
  }

  const contracts = await listContracts(session.user.tenantId, {
    organisationId: searchParams.get("organisationId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });
  return NextResponse.json(contracts);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "contracts.edit");

  const body = await request.json();
  try {
    if (body.action === "createRateCard") {
      const card = await createRateCard(session.user.tenantId, body);
      return NextResponse.json(card, { status: 201 });
    }
    const contract = await createContract(session.user.tenantId, body);
    return NextResponse.json(contract, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
