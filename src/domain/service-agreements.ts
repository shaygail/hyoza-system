import { prisma } from "@/lib/prisma";

export async function listServiceAgreements(tenantId: string) {
  return prisma.serviceAgreement.findMany({
    where: { tenantId },
    include: { organisation: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getServiceAgreementForOrganisation(
  tenantId: string,
  organisationId: string
) {
  return prisma.serviceAgreement.findFirst({
    where: {
      tenantId,
      organisationId,
      isActive: true,
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrganisationTimeUsage(
  tenantId: string,
  organisationId: string,
  month?: Date
) {
  const start = month ? new Date(month.getFullYear(), month.getMonth(), 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

  const entries = await prisma.timeEntry.findMany({
    where: {
      tenantId,
      organisationId,
      createdAt: { gte: start, lte: end },
    },
  });

  const usedMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
  const agreement = await getServiceAgreementForOrganisation(tenantId, organisationId);

  return {
    usedMinutes,
    allowanceMinutes: agreement?.monthlyMinutesAllowance ?? null,
    remainingMinutes: agreement?.monthlyMinutesAllowance
      ? Math.max(0, agreement.monthlyMinutesAllowance - usedMinutes)
      : null,
    agreement,
  };
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
  return prisma.serviceAgreement.create({
    data: {
      tenantId,
      organisationId: data.organisationId,
      name: data.name,
      monthlyMinutesAllowance: data.monthlyMinutesAllowance,
      responseMinutes: data.responseMinutes,
      resolutionMinutes: data.resolutionMinutes,
    },
    include: { organisation: true },
  });
}
