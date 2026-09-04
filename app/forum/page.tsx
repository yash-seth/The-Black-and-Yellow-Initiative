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
    <div className="mx-auto max-w-3xl w-full px-4 py-10 space-y-10">
      <div>
        <p className="by-eyebrow mb-4">Discussion</p>
        <h1 className="by-title text-3xl sm:text-4xl">Forum</h1>
        <hr className="by-rule mt-6" />
      </div>

      <div className="border-t border-[color:var(--by-line)]">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/forum/${c.slug}`}
            className="by-card--link group flex items-baseline justify-between gap-4 border-b border-[color:var(--by-line)] py-4"
          >
            <div>
              <div className="by-title text-lg">{c.name}</div>
              {c.description && (
                <div className="text-sm by-muted mt-0.5">{c.description}</div>
              )}
            </div>
            <span
              aria-hidden
              className="by-muted transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        ))}
      </div>

      <div>
        <p className="by-eyebrow mb-3">Recent activity</p>
        <ul className="border-t border-[color:var(--by-line)]">
          {threads.map((t) => (
            <li
              key={t.id}
              className="py-2.5 text-sm flex justify-between gap-3 border-b border-[color:var(--by-line)]"
            >
              <Link
                href={
                  t.speed_breaker_id
                    ? `/pin/${t.speed_breaker_id}`
                    : `/forum/thread/${t.id}`
                }
                className="by-link decoration-transparent"
              >
                {t.title}
              </Link>
              <span className="by-muted shrink-0 text-xs uppercase tracking-[0.04em]">
                {t.category?.name ?? "Speed breaker"}
              </span>
            </li>
          ))}
          {threads.length === 0 && (
            <li className="py-2.5 text-sm by-muted border-b border-[color:var(--by-line)]">
              Nothing here yet.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
