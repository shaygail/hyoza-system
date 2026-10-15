import { prisma } from "@/lib/prisma";

export interface TenantSettings {
  timezone: string;
  portalTitle: string;
  welcomeMessage: string;
  branding: {
    logoUrl: string;
    primaryColor: string;
  };
}

const DEFAULTS: TenantSettings = {
  timezone: "Europe/London",
  portalTitle: "Support",
  welcomeMessage: "Get help from our support team. Sign in to view your tickets or submit a new request.",
  branding: {
    logoUrl: "",
    primaryColor: "#0c66e4",
  },
};

export function parseTenantSettings(raw: string): TenantSettings {
  try {
    const parsed = JSON.parse(raw);
    return {
      timezone: parsed.timezone ?? DEFAULTS.timezone,
      portalTitle: parsed.portalTitle ?? DEFAULTS.portalTitle,
      welcomeMessage: parsed.welcomeMessage ?? DEFAULTS.welcomeMessage,
      branding: {
        logoUrl: parsed.branding?.logoUrl ?? DEFAULTS.branding.logoUrl,
        primaryColor: parsed.branding?.primaryColor ?? DEFAULTS.branding.primaryColor,
      },
    };
  } catch {
    return DEFAULTS;
  }
}

export async function getTenantSettings(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant not found");
  return { ...parseTenantSettings(tenant.settings), tenantName: tenant.name };
}

export async function updateTenantSettings(tenantId: string, settings: Partial<TenantSettings>) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant not found");

  const current = parseTenantSettings(tenant.settings);
  const merged: TenantSettings = {
    timezone: settings.timezone ?? current.timezone,
    portalTitle: settings.portalTitle ?? current.portalTitle,
    welcomeMessage: settings.welcomeMessage ?? current.welcomeMessage,
    branding: {
      logoUrl: settings.branding?.logoUrl ?? current.branding.logoUrl,
      primaryColor: settings.branding?.primaryColor ?? current.branding.primaryColor,
    },
  };

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { settings: JSON.stringify(merged) },
  });

  return merged;
}

export async function updateSlaPolicy(
  tenantId: string,
  policyId: string,
  data: { responseMinutes?: number; resolutionMinutes?: number; escalationMinutes?: number | null }
) {
  return prisma.slaPolicy.updateMany({
    where: { id: policyId, tenantId },
    data,
  });
}

export async function updateBusinessCalendar(
  tenantId: string,
  calendarId: string,
  data: {
    name?: string;
    timezone?: string;
    startTime?: string;
    endTime?: string;
    holidays?: string[];
  }
) {
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.timezone !== undefined) update.timezone = data.timezone;
  if (data.startTime !== undefined) update.startTime = data.startTime;
  if (data.endTime !== undefined) update.endTime = data.endTime;
  if (data.holidays !== undefined) update.holidays = JSON.stringify(data.holidays);

  return prisma.businessCalendar.updateMany({
    where: { id: calendarId, tenantId },
    data: update,
  });
}

export async function createEmailMailbox(
  tenantId: string,
  data: { name: string; emailAddress: string; organisationId?: string }
) {
  return prisma.emailMailbox.create({
    data: { tenantId, ...data },
  });
}

export async function toggleAutomationRule(tenantId: string, ruleId: string, isActive: boolean) {
  return prisma.automationRule.updateMany({
    where: { id: ruleId, tenantId },
    data: { isActive },
  });
}
