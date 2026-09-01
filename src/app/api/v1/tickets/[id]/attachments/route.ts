import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addAttachment } from "@/domain/attachments";
import { requirePermission } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await requirePermission(session.user.id, "tickets.edit");

  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const attachment = await addAttachment(id, session.user.id, {
      name: file.name,
      type: file.type,
      size: file.size,
      buffer,
    });
    return NextResponse.json(attachment, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
