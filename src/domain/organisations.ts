import { prisma } from "@/lib/prisma";

export async function listOrganisations(tenantId: string, opts?: { minSecurityLevel?: number }) {
  return prisma.organisation.findMany({
    where: {
      tenantId,
      ...(opts?.minSecurityLevel != null
        ? { minSecurityLevel: { lte: opts.minSecurityLevel } }
        : {}),
    },
    include: { _count: { select: { tickets: true, contacts: true, contracts: true } } },
    orderBy: { name: "asc" },
  });
}

export async function getOrganisation(tenantId: string, id: string) {
  return prisma.organisation.findFirst({
    where: { id, tenantId },
    include: {
      contacts: { 
        orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
        include: { user: { select: { id: true } } },
      },
      contracts: { orderBy: { createdAt: "desc" }, take: 10 },
      assets: { take: 20, orderBy: { assetTag: "asc" } },
      invoices: { orderBy: { createdAt: "desc" }, take: 10, include: { lines: true } },
      _count: { select: { tickets: true, contacts: true, contracts: true } },
    },
  });
}

export async function createOrganisation(
  tenantId: string,
  data: {
    name: string;
    accountCode?: string;
    status?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    taxId?: string;
    billingEmail?: string;
    paymentTerms?: string;
    minSecurityLevel?: number;
  }
) {
  return prisma.organisation.create({
    data: {
      tenantId,
      name: data.name,
      accountCode: data.accountCode,
      status: data.status ?? "active",
      phone: data.phone,
      email: data.email,
      address: data.address,
      notes: data.notes,
      taxId: data.taxId,
      billingEmail: data.billingEmail,
      paymentTerms: data.paymentTerms,
      minSecurityLevel: data.minSecurityLevel ?? 1,
    },
  });
}

export async function updateOrganisation(
  tenantId: string,
  id: string,
  data: Partial<{
    name: string;
    accountCode: string | null;
    status: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    taxId: string | null;
    billingEmail: string | null;
    paymentTerms: string | null;
    xeroContactId: string | null;
    minSecurityLevel: number;
  }>
) {
  const existing = await prisma.organisation.findFirst({ where: { id, tenantId } });
  if (!existing) throw new Error("Organisation not found");

  return prisma.organisation.update({ where: { id }, data });
}

export async function createContact(
  tenantId: string,
  data: {
    organisationId: string;
    name: string;
    email: string;
    phone?: string;
    jobTitle?: string;
    isPrimary?: boolean;
  }
) {
  const org = await prisma.organisation.findFirst({
    where: { id: data.organisationId, tenantId },
  });
  if (!org) throw new Error("Organisation not found");

  return prisma.contact.create({
    data: {
      tenantId,
      organisationId: data.organisationId,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      jobTitle: data.jobTitle,
      isPrimary: data.isPrimary ?? false,
    },
  });
}

export async function updateContact(
  tenantId: string,
  id: string,
  data: Partial<{
    name: string;
    email: string;
    phone: string | null;
    jobTitle: string | null;
    isPrimary: boolean;
  }>
) {
  const existing = await prisma.contact.findFirst({ where: { id, tenantId } });
  if (!existing) throw new Error("Contact not found");

  return prisma.contact.update({
    where: { id },
    data: {
      ...data,
      ...(data.email ? { email: data.email.toLowerCase() } : {}),
    },
  });
}
