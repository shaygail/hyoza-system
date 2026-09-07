import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addInternalNote } from "@/domain/comments";
import { requirePermission } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await requirePermission(session.user.id, "tickets.internal_notes");

  const { id } = await params;
  const body = await request.json();

  try {
    const taggedUserIds = Array.isArray(body.taggedUserIds)
      ? body.taggedUserIds.filter((id: unknown) => typeof id === "string")
      : undefined;
    const note = await addInternalNote(id, session.user.id, body.body, { taggedUserIds });
    return NextResponse.json(note, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
