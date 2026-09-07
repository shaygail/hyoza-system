import { prisma } from "@/lib/prisma";

export type ContractType = "block_hours" | "retainer" | "tm";
export type ContractStatus = "draft" | "active" | "paused" | "expired" | "cancelled";

export async function listContracts(tenantId: string, filters?: { organisationId?: string; status?: string }) {
  return prisma.contract.findMany({
    where: {
      tenantId,
      ...(filters?.organisationId ? { organisationId: filters.organisationId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
    include: {
      organisation: { select: { id: true, name: true, accountCode: true } },
      rateCard: { include: { lines: { include: { workType: true } } } },
      allowances: { orderBy: { periodStart: "desc" }, take: 3 },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getContract(tenantId: string, id: string) {
  return prisma.contract.findFirst({
    where: { id, tenantId },
    include: {
      organisation: true,
      rateCard: { include: { lines: { include: { workType: true } } } },
      allowances: { orderBy: { periodStart: "desc" } },
      billingPeriods: { orderBy: { startDate: "desc" }, take: 6 },
    },
  });
}

export async function getActiveContractForOrganisation(tenantId: string, organisationId: string) {
  return prisma.contract.findFirst({
    where: {
      tenantId,
      organisationId,
      status: "active",
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    include: {
      rateCard: { include: { lines: { include: { workType: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getContractUsage(tenantId: string, contractId: string, month?: Date) {
  const contract = await prisma.contract.findFirst({ where: { id: contractId, tenantId } });
  if (!contract) return null;

  const start = month
    ? new Date(month.getFullYear(), month.getMonth(), 1)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

  const entries = await prisma.timeEntry.findMany({
    where: {
      tenantId,
      contractId,
      isBillable: true,
      status: { in: ["submitted", "approved"] },
      createdAt: { gte: start, lte: end },
    },
  });

  const usedMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
  const allowance = contract.monthlyMinutes ?? null;

  return {
    contract,
    usedMinutes,
    allowanceMinutes: allowance,
    remainingMinutes: allowance != null ? Math.max(0, allowance - usedMinutes) : null,
    overageMinutes: allowance != null ? Math.max(0, usedMinutes - allowance) : 0,
    periodStart: start,
    periodEnd: end,
  };
}

export async function createContract(
  tenantId: string,
  data: {
    organisationId: string;
    name: string;
    contractType?: ContractType;
    status?: ContractStatus;
    currency?: string;
    notes?: string;
    monthlyMinutes?: number;
    retainerAmount?: number;
    overageHourlyRate?: number;
    rateCardId?: string;
    responseMinutes?: number;
    resolutionMinutes?: number;
    startDate?: string;
    endDate?: string;
    minSecurityLevel?: number;
  }
) {
  return prisma.contract.create({
    data: {
      tenantId,
      organisationId: data.organisationId,
      name: data.name,
      contractType: data.contractType ?? "block_hours",
      status: data.status ?? "draft",
      currency: data.currency ?? "NZD",
      notes: data.notes,
      monthlyMinutes: data.monthlyMinutes,
      retainerAmount: data.retainerAmount,
      overageHourlyRate: data.overageHourlyRate,
      rateCardId: data.rateCardId,
      responseMinutes: data.responseMinutes,
      resolutionMinutes: data.resolutionMinutes,
      minSecurityLevel: data.minSecurityLevel ?? 1,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
    include: { organisation: true, rateCard: true },
  });
}

export async function updateContract(
  tenantId: string,
  id: string,
  data: Partial<{
    name: string;
    contractType: ContractType;
    status: ContractStatus;
    currency: string;
    notes: string | null;
    monthlyMinutes: number | null;
    retainerAmount: number | null;
    overageHourlyRate: number | null;
    rateCardId: string | null;
    responseMinutes: number | null;
    resolutionMinutes: number | null;
    startDate: string;
    endDate: string | null;
    minSecurityLevel: number;
  }>
) {
  const existing = await prisma.contract.findFirst({ where: { id, tenantId } });
  if (!existing) throw new Error("Contract not found");

  return prisma.contract.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.contractType !== undefined ? { contractType: data.contractType } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.monthlyMinutes !== undefined ? { monthlyMinutes: data.monthlyMinutes } : {}),
      ...(data.retainerAmount !== undefined ? { retainerAmount: data.retainerAmount } : {}),
      ...(data.overageHourlyRate !== undefined ? { overageHourlyRate: data.overageHourlyRate } : {}),
      ...(data.rateCardId !== undefined ? { rateCardId: data.rateCardId } : {}),
      ...(data.responseMinutes !== undefined ? { responseMinutes: data.responseMinutes } : {}),
      ...(data.resolutionMinutes !== undefined ? { resolutionMinutes: data.resolutionMinutes } : {}),
      ...(data.minSecurityLevel !== undefined ? { minSecurityLevel: data.minSecurityLevel } : {}),
      ...(data.startDate !== undefined ? { startDate: new Date(data.startDate) } : {}),
      ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
    },
    include: { organisation: true, rateCard: true },
  });
}

export async function listRateCards(tenantId: string) {
  return prisma.rateCard.findMany({
    where: { tenantId },
    include: { lines: { include: { workType: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createRateCard(
  tenantId: string,
  data: {
    name: string;
    isDefault?: boolean;
    lines?: { workTypeId: string; hourlyRate: number; afterHoursMultiplier?: number }[];
  }
) {
  if (data.isDefault) {
    await prisma.rateCard.updateMany({ where: { tenantId }, data: { isDefault: false } });
  }

  return prisma.rateCard.create({
    data: {
      tenantId,
      name: data.name,
      isDefault: data.isDefault ?? false,
      lines: data.lines
        ? {
            create: data.lines.map((l) => ({
              workTypeId: l.workTypeId,
              hourlyRate: l.hourlyRate,
              afterHoursMultiplier: l.afterHoursMultiplier ?? 1.5,
            })),
          }
        : undefined,
    },
    include: { lines: { include: { workType: true } } },
  });
}

/** Backward-compatible aliases used by older agreement routes. */
export async function listServiceAgreements(tenantId: string) {
  const contracts = await listContracts(tenantId);
  return contracts.map((c) => ({
    ...c,
    monthlyMinutesAllowance: c.monthlyMinutes,
    isActive: c.status === "active",
  }));
}

export async function createServiceAgreement(
  tenantId: string,
  data: {
    organisationId: string;
    name: string;
    monthlyMinutesAllowance?: number;
    responseMinutes?: number;
    resolutionMinutes?: number;
  }
) {
  return createContract(tenantId, {
    organisationId: data.organisationId,
    name: data.name,
    contractType: "block_hours",
    status: "active",
    monthlyMinutes: data.monthlyMinutesAllowance,
    responseMinutes: data.responseMinutes,
    resolutionMinutes: data.resolutionMinutes,
  });
}

export async function getOrganisationTimeUsage(
  tenantId: string,
  organisationId: string,
  month?: Date
) {
  const contract = await getActiveContractForOrganisation(tenantId, organisationId);
  if (!contract) {
    return {
      usedMinutes: 0,
      allowanceMinutes: null,
      remainingMinutes: null,
      agreement: null,
      contract: null,
    };
  }
  const usage = await getContractUsage(tenantId, contract.id, month);
  return {
    usedMinutes: usage?.usedMinutes ?? 0,
    allowanceMinutes: usage?.allowanceMinutes ?? null,
    remainingMinutes: usage?.remainingMinutes ?? null,
    agreement: contract,
    contract,
  };
}
