import { prisma } from "@/lib/prisma";

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
  permissionKeys: string[]
) {
  const role = await prisma.role.findFirst({ where: { id: roleId, tenantId } });
  if (!role) throw new Error("Role not found");
  if (role.isSystem) throw new Error("Cannot modify system role permissions via this API");

  const permissions = await prisma.permission.findMany({
    where: { key: { in: permissionKeys } },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.rolePermission.createMany({
    data: permissions.map((p) => ({ roleId, permissionId: p.id })),
  });

  return prisma.role.findUnique({
    where: { id: roleId },
    include: { rolePermissions: { include: { permission: true } } },
  });
}
