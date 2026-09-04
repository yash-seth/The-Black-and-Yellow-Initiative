import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewThreadForm } from "@/components/NewThreadForm";

interface ThreadRow {
  id: string;
  title: string;
  last_post_at: string;
  created_at: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("forum_categories")
    .select("name")
    .eq("slug", category)
    .maybeSingle();
  return { title: data?.name ?? "Forum" };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const supabase = await createClient();

  const { data: cat } = await supabase
    .from("forum_categories")
    .select("*")
    .eq("slug", category)
    .maybeSingle();
  if (!cat) notFound();

  const { data: threadRows } = await supabase
    .from("forum_threads")
    .select("id,title,last_post_at,created_at")
    .eq("category_id", cat.id)
    .eq("status", "open")
    .order("last_post_at", { ascending: false });
  const threads = (threadRows as ThreadRow[]) ?? [];

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-10 space-y-8">
      <Link href="/forum" className="by-link text-sm by-muted">
        ← All categories
      </Link>
      <div>
        <h1 className="by-title text-3xl sm:text-4xl">{cat.name}</h1>
        {cat.description && (
          <p className="text-sm by-muted mt-1">{cat.description}</p>
        )}
        <hr className="by-rule mt-6" />
      </div>

      <ul className="border-t border-[color:var(--by-line)]">
        {threads.map((t) => (
          <li
            key={t.id}
            className="py-3 border-b border-[color:var(--by-line)]"
          >
            <Link
              href={`/forum/thread/${t.id}`}
              className="text-sm font-semibold by-link decoration-transparent"
            >
              {t.title}
            </Link>
            <div className="text-xs by-muted mt-0.5">
              last activity {new Date(t.last_post_at).toLocaleString()}
            </div>
          </li>
        ))}
        {threads.length === 0 && (
          <li className="py-3 text-sm by-muted border-b border-[color:var(--by-line)]">
            No threads yet — start one below.
          </li>
        )}
      </ul>

      <div className="by-card p-5">
        <p className="by-eyebrow mb-3">Start a thread</p>
        <NewThreadForm categoryId={cat.id} categorySlug={cat.slug} />
      </div>
    </div>
  );
}
