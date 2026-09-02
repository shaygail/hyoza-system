import Link from "next/link";
import { auth } from "@/lib/auth";
import { getKbArticle } from "@/domain/knowledge-base";
import { notFound } from "next/navigation";

export default async function PortalKnowledgeArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { slug } = await params;
  const article = await getKbArticle(session.user.tenantId, slug);
  if (!article || article.status !== "published") notFound();

  return (
    <div className="space-y-4">
      <Link href="/portal/knowledge" className="text-sm text-slate-600 hover:underline">
        ← Help articles
      </Link>
      <article className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-900">{article.title}</h1>
        {article.category && (
          <p className="mt-1 text-sm text-slate-500">{article.category.name}</p>
        )}
        <div className="mt-6 whitespace-pre-wrap text-slate-700">{article.body}</div>
      </article>
    </div>
  );
}
