"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function NewThreadForm({
  categoryId,
}: {
  categoryId: string;
  categorySlug: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    setError(null);

    const { data: thread, error: tErr } = await supabase
      .from("forum_threads")
      .insert({
        category_id: categoryId,
        title: title.trim().slice(0, 200),
        author_id: userId,
        status: "open",
      })
      .select("id")
      .single();

    if (tErr || !thread) {
      setBusy(false);
      setError(tErr?.message ?? "Could not create thread.");
      return;
    }

    const { error: pErr } = await supabase.from("forum_posts").insert({
      thread_id: thread.id,
      author_id: userId,
      body: body.trim(),
      status: "visible",
    });
    setBusy(false);
    if (pErr) {
      setError(pErr.message);
      return;
    }
    router.push(`/forum/thread/${thread.id}`);
  }

  if (!userId)
    return (
      <p className="text-sm">
        <Link href="/login" className="underline font-medium">
          Sign in
        </Link>{" "}
        to start a thread.
      </p>
    );

  return (
    <form onSubmit={submit} className="space-y-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Thread title"
        maxLength={200}
        className="w-full rounded border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your first post…"
        rows={4}
        maxLength={5000}
        className="w-full rounded border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={busy}
        className="rounded-full bg-[color:var(--by-yellow)] text-black font-semibold px-4 py-1.5 text-sm disabled:opacity-50"
      >
        {busy ? "Posting…" : "Create thread"}
      </button>
    </form>
  );
}
