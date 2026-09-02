import { prisma } from "@/lib/prisma";

export async function listAssets(tenantId: string, organisationId?: string) {
  return prisma.asset.findMany({
    where: {
      tenantId,
      ...(organisationId ? { organisationId } : {}),
    },
    include: { organisation: true },
    orderBy: { assetTag: "asc" },
  });
}

export async function getAsset(tenantId: string, id: string) {
  return prisma.asset.findFirst({
    where: { id, tenantId },
    include: {
      organisation: true,
      tickets: {
        where: { deletedAt: null },
        include: { status: true, priority: true },
        orderBy: { updatedAt: "desc" },
        take: 20,
      },
    },
  });
}

export async function createAsset(
  tenantId: string,
  data: {
    organisationId: string;
    assetTag: string;
    name: string;
    assetType?: string;
    status?: string;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    operatingSystem?: string;
    location?: string;
    notes?: string;
  }
) {
  return prisma.asset.create({
    data: { tenantId, ...data },
    include: { organisation: true },
  });
}
