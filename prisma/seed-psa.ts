import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_SECURITY_LEVELS: Record<string, number> = {
  super_admin: 100,
  administrator: 80,
  manager: 60,
  finance: 50,
  team_leader: 40,
  senior_agent: 30,
  agent: 10,
  customer: 1,
};

const PSA_PERMISSIONS = [
  { key: "contracts.view", description: "View contracts" },
  { key: "contracts.edit", description: "Create and edit contracts" },
  { key: "billing.view", description: "View billing periods and invoices" },
  { key: "billing.edit", description: "Manage billing and approve invoices" },
  { key: "admin.security", description: "Manage security levels, browse schemes, permission matrix" },
];

const ROLE_PSA_DEFAULTS: Record<string, string[]> = {
  super_admin: [
    "contracts.view",
    "contracts.edit",
    "billing.view",
    "billing.edit",
    "admin.security",
  ],
  administrator: ["contracts.view", "contracts.edit", "billing.view", "billing.edit"],
  manager: ["contracts.view", "contracts.edit", "billing.view", "billing.edit"],
  finance: ["contracts.view", "contracts.edit", "billing.view", "billing.edit"],
  team_leader: ["contracts.view", "billing.view"],
  senior_agent: ["contracts.view"],
};

async function ensurePermission(key: string, description: string) {
  return prisma.permission.upsert({
    where: { key },
    update: { description },
    create: { key, description },
  });
}

async function setRolePermission(roleId: string, permissionId: string, enabled: boolean) {
  const existing = await prisma.rolePermission.findUnique({
    where: { roleId_permissionId: { roleId, permissionId } },
  });
  if (enabled && !existing) {
    await prisma.rolePermission.create({ data: { roleId, permissionId } });
  }
  if (!enabled && existing) {
    await prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
  }
}

export async function seedPsa() {
  for (const perm of PSA_PERMISSIONS) {
    await ensurePermission(perm.key, perm.description);
  }

  const tenants = await prisma.tenant.findMany();
  const permRows = await prisma.permission.findMany({
    where: { key: { in: PSA_PERMISSIONS.map((p) => p.key) } },
  });
  const permByKey = Object.fromEntries(permRows.map((p) => [p.key, p.id]));

  for (const tenant of tenants) {
    const roles = await prisma.role.findMany({ where: { tenantId: tenant.id } });

    for (const role of roles) {
      const level = DEFAULT_SECURITY_LEVELS[role.code];
      if (level != null) {
        await prisma.role.update({ where: { id: role.id }, data: { securityLevel: level } });
      }

      const defaults = ROLE_PSA_DEFAULTS[role.code] ?? [];
      for (const key of PSA_PERMISSIONS.map((p) => p.key)) {
        await setRolePermission(role.id, permByKey[key], defaults.includes(key));
      }
    }

    const workTypes = await prisma.workType.findMany({ where: { tenantId: tenant.id } });
    let rateCard = await prisma.rateCard.findFirst({ where: { tenantId: tenant.id } });
    if (!rateCard) {
      rateCard = await prisma.rateCard.create({
        data: {
          tenantId: tenant.id,
          name: "Standard Rates",
          isDefault: true,
          lines: {
            create: workTypes.map((wt) => ({
              workTypeId: wt.id,
              hourlyRate: wt.code === "onsite" ? 180 : wt.code === "remote" ? 150 : 100,
              afterHoursMultiplier: 1.5,
            })),
          },
        },
      });
    }

    const orgs = await prisma.organisation.findMany({ where: { tenantId: tenant.id } });
    for (const org of orgs) {
      const existing = await prisma.contract.findFirst({
        where: { tenantId: tenant.id, organisationId: org.id },
      });
      if (!existing) {
        await prisma.contract.create({
          data: {
            tenantId: tenant.id,
            organisationId: org.id,
            rateCardId: rateCard.id,
            name: `${org.name} Block Hours`,
            contractType: "block_hours",
            status: "active",
            monthlyMinutes: 600,
            overageHourlyRate: 150,
            currency: "NZD",
          },
        });
      }
    }

    const schemes = await prisma.browseScheme.count({ where: { tenantId: tenant.id } });
    if (schemes === 0) {
      const agentRole = roles.find((r) => r.code === "agent");
      await prisma.browseScheme.create({
        data: {
          tenantId: tenant.id,
          name: "My tickets only",
          code: "mine",
          description: "Agents see assigned and created tickets",
          rules: JSON.stringify({ scope: "mine" }),
          roleId: agentRole?.id,
          isDefault: false,
        },
      });
      await prisma.browseScheme.create({
        data: {
          tenantId: tenant.id,
          name: "All tickets",
          code: "all",
          description: "View all tenant tickets",
          rules: JSON.stringify({ scope: "all" }),
          isDefault: true,
        },
      });
    }
  }

  console.log("PSA seed completed (contracts, billing perms, security levels, browse schemes).");
}

if (require.main === module) {
  seedPsa()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
