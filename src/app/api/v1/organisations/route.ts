import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await requirePermission(session.user.id, "customers.view");

  const organisations = await prisma.organisation.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      _count: { select: { tickets: true, contacts: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(organisations);
}
