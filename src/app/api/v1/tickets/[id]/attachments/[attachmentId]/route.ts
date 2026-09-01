import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { localStorage } from "@/domain/attachments";
import { requirePermission } from "@/lib/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await requirePermission(session.user.id, "tickets.view");

  const { attachmentId } = await params;
  const attachment = await prisma.ticketAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buffer = await localStorage.read(attachment.storagePath);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${attachment.fileName}"`,
    },
  });
}
