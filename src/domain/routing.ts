import { prisma } from "@/lib/prisma";

export const ROUTING_CATEGORY_CODES = ["accounts", "support", "admin"] as const;

const CATEGORY_TEAM_NAMES: Record<string, string> = {
  accounts: "Accounts",
  support: "Support",
  admin: "Admin",
};

export async function ensureRoutingTeamsAndCategories(tenantId: string) {
  for (const code of ROUTING_CATEGORY_CODES) {
    const teamName = CATEGORY_TEAM_NAMES[code];
    const existingTeam = await prisma.team.findFirst({
      where: { tenantId, name: teamName },
    });
    if (!existingTeam) {
      await prisma.team.create({ data: { tenantId, name: teamName } });
    }
  }

  const sortOrders = { accounts: 10, support: 11, admin: 12 };
  for (const code of ROUTING_CATEGORY_CODES) {
    await prisma.category.upsert({
      where: { tenantId_code: { tenantId, code } },
      update: { name: CATEGORY_TEAM_NAMES[code], sortOrder: sortOrders[code] },
      create: {
        tenantId,
        name: CATEGORY_TEAM_NAMES[code],
        code,
        sortOrder: sortOrders[code],
      },
    });
  }
}

export async function resolveTeamIdForCategory(
  tenantId: string,
  categoryId: string | null | undefined
) {
  if (!categoryId) return null;

  const category = await prisma.category.findFirst({
    where: { id: categoryId, tenantId },
    include: { parent: true },
  });
  if (!category) return null;

  const code = category.parent?.code ?? category.code;
  const teamName = CATEGORY_TEAM_NAMES[code];
  if (!teamName) return null;

  const team = await prisma.team.findFirst({
    where: { tenantId, name: teamName },
  });
  return team?.id ?? null;
}

export async function listRoutingCategories(tenantId: string) {
  return prisma.category.findMany({
    where: { tenantId, code: { in: [...ROUTING_CATEGORY_CODES] } },
    orderBy: { sortOrder: "asc" },
  });
}
