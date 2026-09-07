import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import {
  listBillingPeriods,
  openBillingPeriod,
  closeBillingPeriod,
  listInvoices,
  generateInvoiceDraft,
  updateInvoiceStatus,
  getInvoice,
  invoiceToCsv,
} from "@/domain/billing";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "billing.view");

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get("resource") ?? "periods";

  if (resource === "invoices") {
    const invoices = await listInvoices(session.user.tenantId, {
      organisationId: searchParams.get("organisationId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });
    return NextResponse.json(invoices);
  }

  if (resource === "invoice" && searchParams.get("id")) {
    const invoice = await getInvoice(session.user.tenantId, searchParams.get("id")!);
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (searchParams.get("format") === "csv") {
      return new NextResponse(invoiceToCsv(invoice), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.csv"`,
        },
      });
    }
    return NextResponse.json(invoice);
  }

  const periods = await listBillingPeriods(session.user.tenantId, {
    contractId: searchParams.get("contractId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });
  return NextResponse.json(periods);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "billing.edit");

  const body = await request.json();
  try {
    if (body.action === "openPeriod") {
      const period = await openBillingPeriod(session.user.tenantId, body);
      return NextResponse.json(period, { status: 201 });
    }
    if (body.action === "closePeriod") {
      const period = await closeBillingPeriod(session.user.tenantId, body.periodId);
      return NextResponse.json(period);
    }
    if (body.action === "generateInvoice") {
      const invoice = await generateInvoiceDraft(session.user.tenantId, body.periodId);
      return NextResponse.json(invoice, { status: 201 });
    }
    if (body.action === "updateInvoiceStatus") {
      const invoice = await updateInvoiceStatus(session.user.tenantId, body.invoiceId, body.status);
      return NextResponse.json(invoice);
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
