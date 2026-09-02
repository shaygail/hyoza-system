import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { listKbArticles, createKbArticle } from "@/domain/knowledge-base";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "tickets.view");

  const { searchParams } = new URL(request.url);
  const articles = await listKbArticles(session.user.tenantId, {
    categoryId: searchParams.get("categoryId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    search: searchParams.get("q") ?? undefined,
  });
  return NextResponse.json(articles);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.settings");

  const body = await request.json();
  const article = await createKbArticle(session.user.tenantId, session.user.id, body);
  return NextResponse.json(article, { status: 201 });
}
