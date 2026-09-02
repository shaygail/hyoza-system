import { NextResponse } from "next/server";
import { getGuestAccessByToken, addGuestReply } from "@/domain/guest-portal";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const access = await getGuestAccessByToken(token);
  if (!access || access.ticket.deletedAt) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const { ticket } = access;
  return NextResponse.json({
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    ticketType: ticket.ticketType,
    contactName: ticket.contact?.name ?? access.email,
    comments: ticket.comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      authorName: c.onBehalfOfContact?.name ?? c.author.name,
      isFromSupport: !c.onBehalfOfContact,
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await request.json();

  if (!body.body?.trim()) {
    return NextResponse.json({ error: "Reply message is required." }, { status: 400 });
  }

  try {
    const comment = await addGuestReply(token, body.body);
    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
