import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CRM_PERMS = [
  { key: "customers.view", description: "View CRM accounts and contacts" },
  { key: "customers.edit", description: "Edit CRM accounts and contacts" },
  { key: "admin.grant_crm", description: "Grant or revoke CRM access for roles" },
];

/** Roles that get CRM by default (agents do not). */
const DEFAULT_CRM_VIEW = [
  "super_admin",
  "administrator",
  "manager",
  "finance",
  "team_leader",
  "senior_agent",
];
const DEFAULT_CRM_EDIT = [
  "super_admin",
  "administrator",
  "manager",
  "finance",
  "team_leader",
  "senior_agent",
];

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

/**
 * Ensures Super Admin + CRM access defaults exist on an already-seeded DB.
 * Safe to re-run.
 */
export async function seedCrmAccessControl() {
  for (const perm of CRM_PERMS) {
    await ensurePermission(perm.key, perm.description);
  }

  const tenants = await prisma.tenant.findMany();
  const viewPerm = await prisma.permission.findUniqueOrThrow({ where: { key: "customers.view" } });
  const editPerm = await prisma.permission.findUniqueOrThrow({ where: { key: "customers.edit" } });
  const grantPerm = await prisma.permission.findUniqueOrThrow({ where: { key: "admin.grant_crm" } });
  const allPermissions = await prisma.permission.findMany();

  for (const tenant of tenants) {
    let superAdmin = await prisma.role.findFirst({
      where: { tenantId: tenant.id, code: "super_admin" },
    });

    if (!superAdmin) {
      superAdmin = await prisma.role.create({
        data: {
          tenantId: tenant.id,
          name: "Super Admin",
          code: "super_admin",
          description: "Full access including granting CRM to other roles",
          isSystem: true,
        },
      });
    }

    for (const perm of allPermissions) {
      await setRolePermission(superAdmin.id, perm.id, true);
    }

    const roles = await prisma.role.findMany({ where: { tenantId: tenant.id } });
    for (const role of roles) {
      if (role.code === "super_admin") continue;

      // Only Super Admin may grant CRM; strip from everyone else.
      await setRolePermission(role.id, grantPerm.id, false);

      if (role.code === "agent") {
        await setRolePermission(role.id, viewPerm.id, false);
        await setRolePermission(role.id, editPerm.id, false);
        continue;
      }

      if (role.code === "customer") {
        await setRolePermission(role.id, viewPerm.id, false);
        await setRolePermission(role.id, editPerm.id, false);
        continue;
      }

      // Apply defaults only when first introducing CRM control — if role already has
      // either CRM perm, leave as-is except ensuring grant_crm stays off.
      // For agent we already forced off. For known CRM roles without any CRM, enable defaults.
      const hasView = await prisma.rolePermission.findUnique({
        where: { roleId_permissionId: { roleId: role.id, permissionId: viewPerm.id } },
      });
      const hasEdit = await prisma.rolePermission.findUnique({
        where: { roleId_permissionId: { roleId: role.id, permissionId: editPerm.id } },
      });

      if (!hasView && !hasEdit) {
        if (DEFAULT_CRM_VIEW.includes(role.code)) {
          await setRolePermission(role.id, viewPerm.id, true);
        }
        if (DEFAULT_CRM_EDIT.includes(role.code)) {
          await setRolePermission(role.id, editPerm.id, true);
        }
      }
    }

    // Agents previously had customers.view — remove it explicitly.
    const agentRole = roles.find((r) => r.code === "agent");
    if (agentRole) {
      await setRolePermission(agentRole.id, viewPerm.id, false);
      await setRolePermission(agentRole.id, editPerm.id, false);
    }

    // Administrator keeps CRM view/edit but not grant.
    const adminRole = roles.find((r) => r.code === "administrator");
    if (adminRole) {
      await setRolePermission(adminRole.id, viewPerm.id, true);
      await setRolePermission(adminRole.id, editPerm.id, true);
      await setRolePermission(adminRole.id, grantPerm.id, false);
    }

    // Ensure demo Super Admin user exists.
    const existingSuper = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email: "superadmin@ourcloud.local" },
    });
    if (!existingSuper) {
      const passwordHash = await bcrypt.hash("superadmin123", 10);
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: "superadmin@ourcloud.local",
          passwordHash,
          name: "Super Admin",
          userRoles: { create: { roleId: superAdmin.id } },
        },
      });
    } else {
      const link = await prisma.userRole.findFirst({
        where: { userId: existingSuper.id, roleId: superAdmin.id },
      });
      if (!link) {
        await prisma.userRole.create({
          data: { userId: existingSuper.id, roleId: superAdmin.id },
        });
      }
    }
  }

  console.log("CRM access control ensured (Super Admin + role defaults).");
}

if (require.main === module) {
  seedCrmAccessControl()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
