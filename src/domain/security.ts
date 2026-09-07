import { prisma } from "@/lib/prisma";
import { getUserPermissions } from "@/lib/permissions";

export async function getUserSecurityLevel(userId: string): Promise<number> {
  const roles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  if (roles.length === 0) return 1;
  return Math.max(...roles.map((r) => r.role.securityLevel ?? 1));
}

export async function logSecurityAudit(params: {
  tenantId: string;
  actorId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  detail?: Record<string, unknown>;
}) {
  return prisma.securityAuditLog.create({
    data: {
      tenantId: params.tenantId,
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      detail: JSON.stringify(params.detail ?? {}),
    },
  });
}

export async function listSecurityAudits(tenantId: string, take = 50) {
  return prisma.securityAuditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function updateRoleSecurityLevel(
  tenantId: string,
  roleId: string,
  securityLevel: number,
  actorId: string
) {
  const role = await prisma.role.findFirst({ where: { id: roleId, tenantId } });
  if (!role) throw new Error("Role not found");
  if (role.code === "super_admin") throw new Error("Cannot change Super Admin security level");

  const updated = await prisma.role.update({
    where: { id: roleId },
    data: { securityLevel },
  });

  await logSecurityAudit({
    tenantId,
    actorId,
    action: "role.security_level_changed",
    targetType: "role",
    targetId: roleId,
    detail: { code: role.code, securityLevel },
  });

  return updated;
}

export async function listBrowseSchemes(tenantId: string) {
  return prisma.browseScheme.findMany({
    where: { tenantId },
    include: { role: { select: { id: true, name: true, code: true } } },
    orderBy: { name: "asc" },
  });
}

export async function upsertBrowseScheme(
  tenantId: string,
  data: {
    id?: string;
    name: string;
    code: string;
    description?: string;
    rules: Record<string, unknown>;
    roleId?: string | null;
    isDefault?: boolean;
  },
  actorId: string
) {
  if (data.isDefault) {
    await prisma.browseScheme.updateMany({ where: { tenantId }, data: { isDefault: false } });
  }

  const payload = {
    name: data.name,
    code: data.code,
    description: data.description,
    rules: JSON.stringify(data.rules),
    roleId: data.roleId ?? null,
    isDefault: data.isDefault ?? false,
  };

  const scheme = data.id
    ? await prisma.browseScheme.update({ where: { id: data.id }, data: payload })
    : await prisma.browseScheme.create({ data: { tenantId, ...payload } });

  await logSecurityAudit({
    tenantId,
    actorId,
    action: data.id ? "browse_scheme.updated" : "browse_scheme.created",
    targetType: "browse_scheme",
    targetId: scheme.id,
    detail: { code: scheme.code },
  });

  return scheme;
}

export async function getBrowseRulesForUser(userId: string, tenantId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: { roleId: true },
  });
  const roleIds = userRoles.map((r) => r.roleId);

  const scheme =
    (await prisma.browseScheme.findFirst({
      where: { tenantId, roleId: { in: roleIds } },
    })) ??
    (await prisma.browseScheme.findFirst({
      where: { tenantId, isDefault: true },
    }));

  const permissions = await getUserPermissions(userId);
  const rules = scheme ? (JSON.parse(scheme.rules || "{}") as Record<string, unknown>) : {};

  return {
    scheme,
    permissions,
    canViewAllTickets: permissions.includes("tickets.view_all"),
    rules,
  };
}

/** Default security levels applied at seed time. */
export const DEFAULT_SECURITY_LEVELS: Record<string, number> = {
  super_admin: 100,
  administrator: 80,
  manager: 60,
  finance: 50,
  team_leader: 40,
  senior_agent: 30,
  agent: 10,
  customer: 1,
};
