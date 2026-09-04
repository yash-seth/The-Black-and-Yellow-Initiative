import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThreadView } from "@/components/ThreadView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("forum_threads")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  return { title: data?.title ?? "Thread" };
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("forum_threads")
    .select("id,title,status,speed_breaker_id,category:forum_categories(slug,name)")
    .eq("id", id)
    .maybeSingle();

  if (!thread || thread.status === "removed") notFound();

  const category = thread.category as unknown as {
    slug: string;
    name: string;
  } | null;

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-10 space-y-6">
      <Link
        href={category ? `/forum/${category.slug}` : "/forum"}
        className="by-link text-sm by-muted"
      >
        ← {category?.name ?? "Forum"}
      </Link>

      <h1 className="by-title text-2xl sm:text-3xl">{thread.title}</h1>

      {thread.speed_breaker_id && (
        <Link
          href={`/pin/${thread.speed_breaker_id}`}
          className="inline-block text-sm by-link"
        >
          View the speed breaker on the map →
        </Link>
      )}
      <hr className="by-rule" />


      <ThreadView
        threadId={thread.id}
        locked={thread.status === "locked"}
      />
    </div>
  );
}
