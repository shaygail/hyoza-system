import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { listOrganisations, createOrganisation } from "@/domain/organisations";
import { getUserSecurityLevel } from "@/domain/security";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "customers.view");

  const level = await getUserSecurityLevel(session.user.id);
  const orgs = await listOrganisations(session.user.tenantId, { minSecurityLevel: level });
  return NextResponse.json(orgs);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "customers.edit");

  const body = await request.json();
  try {
    const org = await createOrganisation(session.user.tenantId, body);
    return NextResponse.json(org, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
