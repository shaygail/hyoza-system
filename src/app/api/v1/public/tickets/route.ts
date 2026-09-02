import { NextResponse } from "next/server";
import { createGuestTicket } from "@/domain/guest-portal";

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.name?.trim() || !body.email?.trim() || !body.subject?.trim() || !body.description?.trim()) {
    return NextResponse.json(
      { error: "Name, email, subject, and description are required." },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email.trim())) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    const result = await createGuestTicket({
      name: body.name,
      email: body.email,
      subject: body.subject,
      description: body.description,
      priorityId: body.priorityId,
      ticketTypeId: body.ticketTypeId,
    });

    return NextResponse.json(
      {
        ticketNumber: result.ticket.ticketNumber,
        accessToken: result.accessToken,
        accessUrl: result.accessUrl,
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
