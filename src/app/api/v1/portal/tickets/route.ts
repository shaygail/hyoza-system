import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listCustomerTickets, createCustomerTicket } from "@/domain/portal";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tickets = await listCustomerTickets(session.user.id);
  return NextResponse.json(tickets);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  try {
    const ticket = await createCustomerTicket(session.user.id, session.user.tenantId, body);
    return NextResponse.json(ticket, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
