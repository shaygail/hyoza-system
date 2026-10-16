import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createInvoiceFromReview, updateDraftInvoiceLines, writeOffTimeEntry } from "@/domain/finance";
import { updateInvoiceStatus } from "@/domain/billing";
import { logSecurityAudit } from "@/domain/security";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasPermission(session.user.id, "billing.edit"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantId, id: actorId } = session.user;
  const body = await request.json().catch(() => ({}));

  try {
    switch (body.action) {
      case "createInvoice": {
        const invoice = await createInvoiceFromReview(tenantId, String(body.contractId), actorId);
        return NextResponse.json(invoice, { status: 201 });
      }
      case "writeOff": {
        const entry = await writeOffTimeEntry(tenantId, String(body.entryId), actorId, String(body.reason ?? ""));
        return NextResponse.json(entry);
      }
      case "updateLines": {
        const invoice = await updateDraftInvoiceLines(tenantId, String(body.invoiceId), body.lines, actorId);
        return NextResponse.json(invoice);
      }
      case "setStatus": {
        if (!["draft", "approved", "void"].includes(body.status)) {
          return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }
        const invoice = await updateInvoiceStatus(tenantId, String(body.invoiceId), body.status);
        await logSecurityAudit({
          tenantId,
          actorId,
          action: `invoice.${body.status}`,
          targetType: "invoice",
          targetId: invoice.id,
          detail: { invoiceNumber: invoice.invoiceNumber, total: invoice.total },
        });
        return NextResponse.json(invoice);
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
