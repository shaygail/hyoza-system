import { prisma } from "@/lib/prisma";

export async function getUserPermissions(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  const permissions = new Set<string>();
  for (const ur of userRoles) {
    for (const rp of ur.role.rolePermissions) {
      permissions.add(rp.permission.key);
    }
  }
  return Array.from(permissions);
}

export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permission);
}

export async function requirePermission(userId: string, permission: string): Promise<void> {
  const allowed = await hasPermission(userId, permission);
  if (!allowed) {
    throw new Error("Forbidden");
  }
}
