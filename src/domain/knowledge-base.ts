import { prisma } from "@/lib/prisma";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function listKbCategories(tenantId: string) {
  return prisma.kbCategory.findMany({
    where: { tenantId },
    include: {
      children: true,
      _count: { select: { articles: { where: { status: "published" } } } },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listKbArticles(
  tenantId: string,
  opts?: { categoryId?: string; status?: string; search?: string }
) {
  const where: Record<string, unknown> = { tenantId };
  if (opts?.categoryId) where.categoryId = opts.categoryId;
  if (opts?.status) where.status = opts.status;
  if (opts?.search) {
    where.OR = [
      { title: { contains: opts.search } },
      { body: { contains: opts.search } },
    ];
  }

  return prisma.kbArticle.findMany({
    where,
    include: { category: true, author: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getKbArticle(tenantId: string, slug: string) {
  return prisma.kbArticle.findFirst({
    where: { tenantId, slug },
    include: { category: true, author: { select: { id: true, name: true } } },
  });
}

export async function createKbArticle(
  tenantId: string,
  authorId: string,
  data: { title: string; body: string; categoryId?: string; status?: string }
) {
  const slug = slugify(data.title);
  const existing = await prisma.kbArticle.findFirst({ where: { tenantId, slug } });
  const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

  return prisma.kbArticle.create({
    data: {
      tenantId,
      authorId,
      title: data.title,
      slug: finalSlug,
      body: data.body,
      categoryId: data.categoryId,
      status: data.status ?? "draft",
      publishedAt: data.status === "published" ? new Date() : null,
    },
    include: { category: true, author: { select: { id: true, name: true } } },
  });
}

export async function updateKbArticle(
  tenantId: string,
  id: string,
  data: Partial<{ title: string; body: string; categoryId: string | null; status: string }>
) {
  const article = await prisma.kbArticle.findFirst({ where: { id, tenantId } });
  if (!article) throw new Error("Article not found");

  const update: Record<string, unknown> = { ...data };
  if (data.status === "published" && article.status !== "published") {
    update.publishedAt = new Date();
  }

  return prisma.kbArticle.update({
    where: { id },
    data: update,
    include: { category: true, author: { select: { id: true, name: true } } },
  });
}

export async function createKbCategory(tenantId: string, name: string, parentId?: string) {
  const slug = slugify(name);
  return prisma.kbCategory.create({
    data: { tenantId, name, slug, parentId },
  });
}

export async function searchKbForPortal(tenantId: string, query: string) {
  return prisma.kbArticle.findMany({
    where: {
      tenantId,
      status: "published",
      OR: [
        { title: { contains: query } },
        { body: { contains: query } },
      ],
    },
    select: { id: true, title: true, slug: true, body: true },
    take: 10,
  });
}
