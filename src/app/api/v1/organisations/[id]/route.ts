import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { getOrganisation, updateOrganisation, createContact, updateContact } from "@/domain/organisations";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "customers.view");

  const { id } = await params;
  const org = await getOrganisation(session.user.tenantId, id);
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(org);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "customers.edit");

  const { id } = await params;
  const body = await request.json();
  try {
    if (body.action === "createContact") {
      const contact = await createContact(session.user.tenantId, {
        organisationId: id,
        ...body,
      });
      return NextResponse.json(contact, { status: 201 });
    }
    if (body.action === "updateContact") {
      const contact = await updateContact(session.user.tenantId, body.contactId, body);
      return NextResponse.json(contact);
    }
    const org = await updateOrganisation(session.user.tenantId, id, body);
    return NextResponse.json(org);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
