import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { listMailboxes, ingestInboundEmail } from "@/domain/email-to-ticket";
import { createEmailMailbox } from "@/domain/settings";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.settings");

  const mailboxes = await listMailboxes(session.user.tenantId);
  return NextResponse.json(mailboxes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.settings");

  const body = await request.json();

  if (body.action === "simulate") {
    const result = await ingestInboundEmail(body.mailboxId, {
      messageId: `sim-${Date.now()}`,
      fromAddress: body.fromAddress,
      subject: body.subject,
      body: body.body,
    });
    return NextResponse.json(result, { status: 201 });
  }

  if (body.name && body.emailAddress) {
    const mailbox = await createEmailMailbox(session.user.tenantId, body);
    return NextResponse.json(mailbox, { status: 201 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
