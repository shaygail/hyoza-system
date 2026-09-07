import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import {
  getXeroConnection,
  connectXeroStub,
  disconnectXero,
  mapOrganisationToXeroContact,
  pushInvoiceToXero,
  getXeroAuthorizeUrl,
} from "@/domain/xero";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "billing.view");

  const connection = await getXeroConnection(session.user.tenantId);
  const authorizeUrl = getXeroAuthorizeUrl(session.user.tenantId);
  return NextResponse.json({ connection, authorizeUrl, stubMode: !authorizeUrl });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "billing.edit");

  const body = await request.json();
  try {
    if (body.action === "connect") {
      const connection = await connectXeroStub(session.user.tenantId, body);
      return NextResponse.json(connection);
    }
    if (body.action === "disconnect") {
      const connection = await disconnectXero(session.user.tenantId);
      return NextResponse.json(connection);
    }
    if (body.action === "mapContact") {
      const org = await mapOrganisationToXeroContact(
        session.user.tenantId,
        body.organisationId,
        body.xeroContactId
      );
      return NextResponse.json(org);
    }
    if (body.action === "pushInvoice") {
      const invoice = await pushInvoiceToXero(session.user.tenantId, body.invoiceId);
      return NextResponse.json(invoice);
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
