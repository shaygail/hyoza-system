import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await requirePermission(session.user.id, "customers.view");

  const { id } = await params;
  const organisation = await prisma.organisation.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      contacts: true,
      tickets: {
        where: { deletedAt: null },
        include: { status: true, priority: true, assignee: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!organisation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(organisation);
}
