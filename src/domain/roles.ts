import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

const CRM_PERMISSION_KEYS = ["customers.view", "customers.edit"] as const;

export async function listRoles(tenantId: string) {
  return prisma.role.findMany({
    where: { tenantId },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { userRoles: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function listPermissions() {
  return prisma.permission.findMany({ orderBy: { key: "asc" } });
}

export async function createCustomRole(
  tenantId: string,
  data: { name: string; code: string; description?: string; permissionKeys: string[] }
) {
  const existing = await prisma.role.findFirst({
    where: { tenantId, code: data.code },
  });
  if (existing) throw new Error("Role code already exists");

  const permissions = await prisma.permission.findMany({
    where: { key: { in: data.permissionKeys } },
  });

  return prisma.role.create({
    data: {
      tenantId,
      name: data.name,
      code: data.code,
      description: data.description,
      isSystem: false,
      rolePermissions: {
        create: permissions.map((p) => ({ permissionId: p.id })),
      },
    },
    include: {
      rolePermissions: { include: { permission: true } },
    },
  });
}

export async function updateRolePermissions(
  tenantId: string,
  roleId: string,
  permissionKeys: string[],
  options?: { allowSystem?: boolean }
) {
  const role = await prisma.role.findFirst({ where: { id: roleId, tenantId } });
  if (!role) throw new Error("Role not found");
  if (role.code === "super_admin") throw new Error("Cannot modify Super Admin permissions");
  if (role.isSystem && !options?.allowSystem) {
    throw new Error("Cannot modify system role permissions via this API");
  }

  const permissions = await prisma.permission.findMany({
    where: { key: { in: permissionKeys } },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.rolePermission.createMany({
    data: permissions.map((p) => ({ roleId, permissionId: p.id })),
  });

  return prisma.role.findUnique({
    where: { id: roleId },
    include: { rolePermissions: { include: { permission: true } }, _count: { select: { userRoles: true } } },
  });
}

/**
 * Super Admin only: grant or revoke CRM (customers.view / customers.edit) on any role.
 */
export async function setRoleCrmAccess(
  tenantId: string,
  roleId: string,
  access: { view: boolean; edit: boolean },
  actorId: string
) {
  await requirePermission(actorId, "admin.grant_crm");

  const role = await prisma.role.findFirst({ where: { id: roleId, tenantId } });
  if (!role) throw new Error("Role not found");
  if (role.code === "super_admin") {
    throw new Error("Cannot change CRM access for Super Admin");
  }
  if (role.code === "customer") {
    throw new Error("Customer portal role cannot receive CRM access");
  }

  const view = access.view || access.edit;
  const edit = access.edit;

  const permissions = await prisma.permission.findMany({
    where: { key: { in: [...CRM_PERMISSION_KEYS] } },
  });
  const byKey = Object.fromEntries(permissions.map((p) => [p.key, p.id]));

  for (const key of CRM_PERMISSION_KEYS) {
    const permissionId = byKey[key];
    if (!permissionId) continue;
    const enabled = key === "customers.view" ? view : edit;
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

  return prisma.role.findUnique({
    where: { id: roleId },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { userRoles: true } },
    },
  });
}
