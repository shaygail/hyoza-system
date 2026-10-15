import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { logActivity } from "@/domain/activity";
import { revokeGuestAccessForTicket } from "@/domain/guest-portal";
import { isGuestAccessValid } from "@/domain/guest-link-policy";

async function loadTicket(tenantId: string, id: string) {
  return prisma.ticket.findFirst({ where: { id, tenantId, deletedAt: null }, select: { id: true } });
}

/** List customer links for a ticket (without exposing the tokens themselves). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await requirePermission(session.user.id, "tickets.view");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!(await loadTicket(session.user.tenantId, id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const links = await prisma.ticketGuestAccess.findMany({
    where: { ticketId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    links.map((l) => ({
      id: l.id,
      email: l.email,
      createdAt: l.createdAt,
      expiresAt: l.expiresAt,
      revokedAt: l.revokedAt,
      lastUsedAt: l.lastUsedAt,
      isValid: isGuestAccessValid(l),
    }))
  );
}

/** Revoke all customer links for a ticket. A fresh link is issued with the next email. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await requirePermission(session.user.id, "tickets.edit");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!(await loadTicket(session.user.tenantId, id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await revokeGuestAccessForTicket(id);
  await logActivity({
    ticketId: id,
    actorId: session.user.id,
    eventType: "guest_access.revoked",
    payload: { count: result.revoked },
  });
  return NextResponse.json(result);
}
