import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [priorities, ticketTypes, users, teams, organisations, workTypes, categories] = await Promise.all([
    prisma.priority.findMany({ where: { tenantId: session.user.tenantId }, orderBy: { sortOrder: "asc" } }),
    prisma.ticketType.findMany({ where: { tenantId: session.user.tenantId }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ where: { tenantId: session.user.tenantId, isActive: true }, select: { id: true, name: true, email: true } }),
    prisma.team.findMany({ where: { tenantId: session.user.tenantId } }),
    prisma.organisation.findMany({ where: { tenantId: session.user.tenantId }, include: { contacts: true }, orderBy: { name: "asc" } }),
    prisma.workType.findMany({ where: { tenantId: session.user.tenantId }, orderBy: { sortOrder: "asc" } }),
    prisma.category.findMany({ where: { tenantId: session.user.tenantId, parentId: null }, include: { children: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return NextResponse.json({ priorities, ticketTypes, users, teams, organisations, workTypes, categories });
}
