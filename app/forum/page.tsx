import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ForumCategory } from "@/lib/types";

export const metadata: Metadata = {
  title: "Forum",
  description:
    "Discuss dangerous speed breakers and celebrate the ones that get painted.",
};

interface RecentThread {
  id: string;
  title: string;
  last_post_at: string;
  speed_breaker_id: string | null;
  category: { slug: string; name: string } | null;
}

export default async function ForumPage() {
  const supabase = await createClient();

  const { data: cats } = await supabase
    .from("forum_categories")
    .select("*")
    .order("sort");

  const { data: recent } = await supabase
    .from("forum_threads")
    .select("id,title,last_post_at,speed_breaker_id,category:forum_categories(slug,name)")
    .eq("status", "open")
    .order("last_post_at", { ascending: false })
    .limit(15);

  const categories = (cats as ForumCategory[]) ?? [];
  const threads = (recent as unknown as RecentThread[]) ?? [];

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-8">
      <h1 className="text-2xl font-extrabold">Forum</h1>

      <div className="space-y-3">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/forum/${c.slug}`}
            className="block rounded-lg border border-black/10 dark:border-white/10 p-4 hover:border-[color:var(--by-yellow)]"
          >
            <div className="font-bold">{c.name}</div>
            {c.description && (
              <div className="text-sm text-black/60 dark:text-white/60">
                {c.description}
              </div>
            )}
          </Link>
        ))}
      </div>

      <div>
        <h2 className="font-bold mb-2">Recent activity</h2>
        <ul className="divide-y divide-black/5 dark:divide-white/5">
          {threads.map((t) => (
            <li key={t.id} className="py-2 text-sm flex justify-between gap-3">
              <Link
                href={
                  t.speed_breaker_id
                    ? `/pin/${t.speed_breaker_id}`
                    : `/forum/thread/${t.id}`
                }
                className="hover:underline"
              >
                {t.title}
              </Link>
              <span className="text-black/40 dark:text-white/40 shrink-0">
                {t.category?.name ?? "Speed breaker"}
              </span>
            </li>
          ))}
          {threads.length === 0 && (
            <li className="py-2 text-sm text-black/50">Nothing here yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
