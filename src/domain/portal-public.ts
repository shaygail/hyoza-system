import { prisma } from "@/lib/prisma";
import { parseTenantSettings } from "@/domain/settings";

export async function getDefaultTenant() {
  return prisma.tenant.findFirst({ where: { slug: "ourcloud" } });
}

export async function getPublicPortalConfig() {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    return null;
  }

  const settings = parseTenantSettings(tenant.settings);

  const articles = await prisma.kbArticle.findMany({
    where: { tenantId: tenant.id, status: "published" },
    select: { id: true, title: true, slug: true, body: true },
    orderBy: { updatedAt: "desc" },
    take: 6,
  });

  return {
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    portalTitle: settings.portalTitle,
    welcomeMessage: settings.welcomeMessage,
    branding: settings.branding,
    articles,
  };
}

export async function getPortalConfigForUser(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return null;
  const settings = parseTenantSettings(tenant.settings);
  return {
    tenantName: tenant.name,
    portalTitle: settings.portalTitle,
    branding: settings.branding,
  };
}
