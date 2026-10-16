import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getFinanceInvoice } from "@/domain/finance";
import { getXeroConnection } from "@/domain/xero";
import { InvoiceDetailClient } from "@/components/finance/invoice-detail";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const [invoice, canEdit, xero] = await Promise.all([
    getFinanceInvoice(session.user.tenantId, id),
    hasPermission(session.user.id, "billing.edit"),
    getXeroConnection(session.user.tenantId),
  ]);
  if (!invoice) notFound();

  return (
    <InvoiceDetailClient
      canEdit={canEdit}
      xeroConnected={Boolean(xero?.isConnected)}
      invoice={{
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        currency: invoice.currency,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
        notes: invoice.notes,
        xeroInvoiceId: invoice.xeroInvoiceId,
        createdAt: invoice.createdAt.toISOString(),
        issuedAt: invoice.issuedAt?.toISOString() ?? null,
        organisation: invoice.organisation,
        contract: invoice.contract,
        periodLabel: invoice.billingPeriod?.label ?? null,
        lines: invoice.lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitAmount: l.unitAmount,
          lineTotal: l.lineTotal,
          lineType: l.lineType,
        })),
        timeEntries: (invoice.billingPeriod?.timeEntries ?? []).map((e) => ({
          id: e.id,
          createdAt: e.createdAt.toISOString(),
          durationMinutes: e.durationMinutes,
          isBillable: e.isBillable,
          technician: e.user.name,
          workType: e.workType?.name ?? null,
          ticket: e.ticket,
        })),
      }}
    />
  );
}
