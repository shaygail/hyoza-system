import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addComment } from "@/domain/comments";
import { requirePermission } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await requirePermission(session.user.id, "tickets.edit");

  const { id } = await params;
  const body = await request.json();

  try {
    const comment = await addComment(id, session.user.id, body.body);
    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
