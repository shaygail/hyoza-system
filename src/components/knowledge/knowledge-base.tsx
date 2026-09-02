"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus } from "lucide-react";

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  updatedAt: string;
  category: { name: string } | null;
  author: { name: string };
}

export function KnowledgeBaseClient() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load(q?: string) {
    const params = q ? `?q=${encodeURIComponent(q)}` : "";
    const res = await fetch(`/api/v1/knowledge/articles${params}`);
    if (res.ok) setArticles(await res.json());
  }

  async function handleCreate() {
    if (!title.trim() || !body.trim()) return;
    setLoading(true);
    const res = await fetch("/api/v1/knowledge/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, status: "published" }),
    });
    setLoading(false);
    if (res.ok) {
      setShowCreate(false);
      setTitle("");
      setBody("");
      load();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Knowledge Base</h1>
          <p className="text-sm text-slate-500">Articles and guides for agents and customers</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Article
        </Button>
      </div>

      <div className="flex gap-2">
        <input
          type="search"
          placeholder="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(search)}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <Button variant="secondary" onClick={() => load(search)}>Search</Button>
      </div>

      <div className="grid gap-4">
        {articles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center text-slate-500">
            <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2">No articles yet. Create your first knowledge base article.</p>
          </div>
        ) : (
          articles.map((article) => (
            <Link
              key={article.id}
              href={`/app/knowledge/${article.slug}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-ourcloud-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-slate-900">{article.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {article.author.name}
                    {article.category && ` · ${article.category.name}`}
                  </p>
                </div>
                <Badge color={article.status === "published" ? "#22c55e" : "#6b7280"}>
                  {article.status}
                </Badge>
              </div>
            </Link>
          ))
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <h3 className="font-semibold text-slate-900">New Article</h3>
            <input
              className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={8}
              placeholder="Article content..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? "Publishing..." : "Publish"}
              </Button>
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
