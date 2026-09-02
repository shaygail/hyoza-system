import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { getKbArticle, updateKbArticle } from "@/domain/knowledge-base";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const article = await getKbArticle(session.user.tenantId, slug);
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(article);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.settings");

  const { slug } = await params;
  const article = await getKbArticle(session.user.tenantId, slug);
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updated = await updateKbArticle(session.user.tenantId, article.id, body);
  return NextResponse.json(updated);
}
