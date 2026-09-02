import { getKbArticle } from "@/domain/knowledge-base";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function KnowledgeArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const article = await getKbArticle(session.user.tenantId, slug);
  if (!article) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/app/knowledge" className="text-sm text-ourcloud-600 hover:underline">
        ← Back to Knowledge Base
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{article.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {article.author.name}
          {article.category && ` · ${article.category.name}`}
          {article.publishedAt && ` · ${formatDate(article.publishedAt)}`}
        </p>
      </div>
      <div className="prose prose-slate max-w-none rounded-xl border border-slate-200 bg-white p-6">
        <div className="whitespace-pre-wrap text-slate-700">{article.body}</div>
      </div>
    </div>
  );
}
