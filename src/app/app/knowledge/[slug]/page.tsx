import { getKbArticle } from "@/domain/knowledge-base";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader
        title={article.title}
        breadcrumbs={[{ label: "Knowledge base", href: "/app/knowledge" }]}
        description={
          <>
            {article.author.name}
            {article.category && ` · ${article.category.name}`}
            {article.publishedAt && ` · ${formatDate(article.publishedAt)}`}
          </>
        }
      />
      <div className="whitespace-pre-wrap text-sm leading-6 text-slate-900">{article.body}</div>
    </div>
  );
}
