import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchTickets } from "@/domain/search";
import { requirePermission } from "@/lib/permissions";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "tickets.view");

  const { searchParams } = new URL(request.url);
  const tickets = await searchTickets(session.user.tenantId, {
    q: searchParams.get("q") ?? undefined,
    statusId: searchParams.get("statusId") ?? undefined,
    priorityId: searchParams.get("priorityId") ?? undefined,
    assigneeId: searchParams.get("assigneeId") ?? undefined,
    organisationId: searchParams.get("organisationId") ?? undefined,
    ticketTypeId: searchParams.get("ticketTypeId") ?? undefined,
    categoryId: searchParams.get("categoryId") ?? undefined,
  });

  return NextResponse.json(tickets);
}
