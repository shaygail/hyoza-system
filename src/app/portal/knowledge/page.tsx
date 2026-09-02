import Link from "next/link";
import { auth } from "@/lib/auth";
import { listKbArticles } from "@/domain/knowledge-base";

export default async function PortalKnowledgePage() {
  const session = await auth();
  if (!session?.user) return null;

  const articles = await listKbArticles(session.user.tenantId, { status: "published" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Help articles</h1>
        <p className="text-sm text-slate-500">Browse guides and troubleshooting tips</p>
      </div>
      <div className="grid gap-4">
        {articles.length === 0 ? (
          <p className="text-slate-500">No articles published yet.</p>
        ) : (
          articles.map((article) => (
            <Link
              key={article.id}
              href={`/portal/knowledge/${article.slug}`}
              className="block rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition-colors"
            >
              <h2 className="font-medium text-slate-900">{article.title}</h2>
              {article.category && (
                <p className="mt-1 text-xs text-slate-400">{article.category.name}</p>
              )}
              <p className="mt-2 line-clamp-2 text-sm text-slate-500">{article.body}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
