import { prisma } from "@/lib/prisma";
import { getContractUsage } from "@/domain/contracts";
import { buildInvoiceLines, invoiceTotals } from "@/domain/invoice-lines";

export async function nextInvoiceNumber(tenantId: string) {
  const count = await prisma.invoice.count({ where: { tenantId } });
  return `INV-${String(count + 1).padStart(5, "0")}`;
}

export async function listBillingPeriods(tenantId: string, filters?: { contractId?: string; status?: string }) {
  return prisma.billingPeriod.findMany({
    where: {
      tenantId,
      ...(filters?.contractId ? { contractId: filters.contractId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
    include: {
      organisation: { select: { id: true, name: true } },
      contract: { select: { id: true, name: true, contractType: true } },
      _count: { select: { timeEntries: true, invoices: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

export async function openBillingPeriod(
  tenantId: string,
  data: { contractId: string; label?: string; startDate: string; endDate: string }
) {
  const contract = await prisma.contract.findFirst({
    where: { id: data.contractId, tenantId },
  });
  if (!contract) throw new Error("Contract not found");

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const label =
    data.label ??
    `${start.toLocaleString("en", { month: "short" })} ${start.getFullYear()}`;

  const period = await prisma.billingPeriod.create({
    data: {
      tenantId,
      organisationId: contract.organisationId,
      contractId: contract.id,
      label,
      startDate: start,
      endDate: end,
      status: "open",
    },
  });

  await prisma.timeEntry.updateMany({
    where: {
      tenantId,
      contractId: contract.id,
      billingPeriodId: null,
      status: "approved",
      isBillable: true,
      createdAt: { gte: start, lte: end },
    },
    data: { billingPeriodId: period.id },
  });

  return prisma.billingPeriod.findUnique({
    where: { id: period.id },
    include: {
      organisation: true,
      contract: true,
      timeEntries: true,
    },
  });
}

export async function closeBillingPeriod(tenantId: string, periodId: string) {
  const period = await prisma.billingPeriod.findFirst({
    where: { id: periodId, tenantId },
  });
  if (!period) throw new Error("Billing period not found");
  if (period.status === "closed") throw new Error("Period already closed");

  return prisma.billingPeriod.update({
    where: { id: periodId },
    data: { status: "closed", closedAt: new Date() },
  });
}

export async function listInvoices(tenantId: string, filters?: { organisationId?: string; status?: string }) {
  return prisma.invoice.findMany({
    where: {
      tenantId,
      ...(filters?.organisationId ? { organisationId: filters.organisationId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
    include: {
      organisation: { select: { id: true, name: true, billingEmail: true } },
      contract: { select: { id: true, name: true } },
      billingPeriod: { select: { id: true, label: true } },
      lines: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoice(tenantId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { id, tenantId },
    include: {
      organisation: true,
      contract: true,
      billingPeriod: true,
      lines: true,
    },
  });
}

export async function generateInvoiceDraft(tenantId: string, billingPeriodId: string) {
  const period = await prisma.billingPeriod.findFirst({
    where: { id: billingPeriodId, tenantId },
    include: {
      contract: { include: { rateCard: { include: { lines: true } } } },
      timeEntries: { include: { workType: true } },
      organisation: true,
    },
  });
  if (!period) throw new Error("Billing period not found");

  const existing = await prisma.invoice.findFirst({
    where: { billingPeriodId, status: { not: "void" } },
  });
  if (existing) throw new Error("An invoice already exists for this period");

  const contract = period.contract;
  const lines = buildInvoiceLines(contract, period.label, period.timeEntries);
  const { subtotal, taxAmount, total } = invoiceTotals(lines);

  const invoiceNumber = await nextInvoiceNumber(tenantId);

  return prisma.invoice.create({
    data: {
      tenantId,
      organisationId: period.organisationId,
      contractId: period.contractId,
      billingPeriodId: period.id,
      invoiceNumber,
      status: "draft",
      currency: contract.currency,
      subtotal,
      taxAmount,
      total,
      notes: `Generated from billing period ${period.label}`,
      lines: {
        create: lines,
      },
    },
    include: { lines: true, organisation: true, contract: true, billingPeriod: true },
  });
}

export async function updateInvoiceStatus(
  tenantId: string,
  invoiceId: string,
  status: "draft" | "approved" | "void"
) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } });
  if (!invoice) throw new Error("Invoice not found");

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      issuedAt: status === "approved" ? new Date() : invoice.issuedAt,
    },
    include: { lines: true, organisation: true },
  });
}

export function invoiceToCsv(invoice: {
  invoiceNumber: string;
  organisation: { name: string };
  currency: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  lines: { description: string; quantity: number; unitAmount: number; lineTotal: number }[];
}) {
  const rows = [
    ["Invoice", invoice.invoiceNumber],
    ["Account", invoice.organisation.name],
    ["Currency", invoice.currency],
    [],
    ["Description", "Quantity", "Unit Amount", "Line Total"],
    ...invoice.lines.map((l) => [
      l.description,
      String(l.quantity),
      String(l.unitAmount),
      String(l.lineTotal),
    ]),
    [],
    ["Subtotal", "", "", String(invoice.subtotal)],
    ["Tax", "", "", String(invoice.taxAmount)],
    ["Total", "", "", String(invoice.total)],
  ];
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export async function getContractUsageForPeriod(tenantId: string, contractId: string) {
  return getContractUsage(tenantId, contractId);
}
