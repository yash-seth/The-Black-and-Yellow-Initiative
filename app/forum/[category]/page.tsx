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
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">
      <Link href="/forum" className="text-sm underline">
        ← All categories
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold">{cat.name}</h1>
        {cat.description && (
          <p className="text-sm text-black/60 dark:text-white/60">
            {cat.description}
          </p>
        )}
      </div>

      <ul className="divide-y divide-black/5 dark:divide-white/5">
        {threads.map((t) => (
          <li key={t.id} className="py-2">
            <Link
              href={`/forum/thread/${t.id}`}
              className="text-sm font-medium hover:underline"
            >
              {t.title}
            </Link>
            <div className="text-xs text-black/40 dark:text-white/40">
              last activity {new Date(t.last_post_at).toLocaleString()}
            </div>
          </li>
        ))}
        {threads.length === 0 && (
          <li className="py-2 text-sm text-black/50">
            No threads yet — start one below.
          </li>
        )}
      </ul>

      <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
        <h2 className="font-bold mb-2">Start a thread</h2>
        <NewThreadForm categoryId={cat.id} categorySlug={cat.slug} />
      </div>
    </div>
  );
}
