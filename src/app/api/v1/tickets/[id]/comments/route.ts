import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addComment, addCommentAsContact } from "@/domain/comments";
import { requirePermission } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requirePermission(session.user.id, "tickets.edit");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  if (!body.body?.trim()) {
    return NextResponse.json({ error: "Reply message is required." }, { status: 400 });
  }

  const replyAsContact =
    body.replyAs === "contact" || body.replyAs === "customer" || body.replyAs === "user";

  try {
    const comment = replyAsContact
      ? await addCommentAsContact(id, session.user.id, body.body.trim())
      : await addComment(id, session.user.id, body.body.trim());
    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
