import { prisma } from "@/lib/prisma";

export const DEFAULT_DASHBOARD_WIDGETS = [
  "myOpen",
  "unassigned",
  "slaAtRisk",
  "recent",
  "myTickets",
] as const;

export type DashboardWidgetId = (typeof DEFAULT_DASHBOARD_WIDGETS)[number];

export async function getDashboardLayout(userId: string): Promise<DashboardWidgetId[]> {
  const pref = await prisma.userPreference.findUnique({ where: { userId } });
  if (!pref) return [...DEFAULT_DASHBOARD_WIDGETS];
  try {
    return JSON.parse(pref.dashboardLayout) as DashboardWidgetId[];
  } catch {
    return [...DEFAULT_DASHBOARD_WIDGETS];
  }
}

export async function saveDashboardLayout(userId: string, layout: DashboardWidgetId[]) {
  return prisma.userPreference.upsert({
    where: { userId },
    update: { dashboardLayout: JSON.stringify(layout) },
    create: { userId, dashboardLayout: JSON.stringify(layout) },
  });
}
