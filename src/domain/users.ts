import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function listUsersForAdmin(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId },
    include: { userRoles: { include: { role: true } }, teamMembers: { include: { team: true } } },
    orderBy: { name: "asc" },
  });
}

export async function listRoles(tenantId: string) {
  return prisma.role.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
}

export async function updateUserRoles(
  tenantId: string,
  userId: string,
  roleIds: string[],
  actorId: string
) {
  await requirePermission(actorId, "admin.users");

  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) throw new Error("User not found");

  await prisma.userRole.deleteMany({ where: { userId } });
  for (const roleId of roleIds) {
    await prisma.userRole.create({ data: { userId, roleId } });
  }

  return prisma.user.findUnique({
    where: { id: userId },
    include: { userRoles: { include: { role: true } } },
  });
}

export async function updateUserStatus(
  tenantId: string,
  userId: string,
  isActive: boolean,
  actorId: string
) {
  await requirePermission(actorId, "admin.users");

  return prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });
}
