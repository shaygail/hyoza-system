"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { BookOpen, Plus, Search } from "lucide-react";

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
      <PageHeader
        title="Knowledge base"
        description="Articles and guides for agents and customers."
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create article
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          type="search"
          placeholder="Search articles"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(search)}
          className="h-8 pl-8"
        />
      </div>

      <div className="divide-y divide-slate-200 border-y border-slate-200">
        {articles.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2">No articles yet. Create your first knowledge base article.</p>
          </div>
        ) : (
          articles.map((article) => (
            <Link
              key={article.id}
              href={`/app/knowledge/${article.slug}`}
              className="flex items-center gap-3 px-2 py-3 hover:bg-slate-100"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-ourcloud-50 text-ourcloud-700">
                <BookOpen className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium text-slate-900">{article.title}</h3>
                <p className="text-xs text-slate-500">
                  {article.author.name}
                  {article.category && ` · ${article.category.name}`}
                </p>
              </div>
              <Badge color={article.status === "published" ? "#22c55e" : "#6b7280"}>{article.status}</Badge>
            </Link>
          ))
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091e427d]">
          <div className="w-full max-w-lg rounded-[4px] bg-white p-6 shadow-overlay">
            <h3 className="text-xl font-medium text-slate-900">Create article</h3>
            <Input
              className="mt-4"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              className="mt-3"
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
