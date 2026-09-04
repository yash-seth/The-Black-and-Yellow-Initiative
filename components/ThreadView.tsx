"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ReportButton } from "@/components/ReportButton";
import type { PostStatus } from "@/lib/types";

interface PostRow {
  id: string;
  parent_id: string | null;
  author_id: string | null;
  body: string;
  status: PostStatus;
  created_at: string;
  author: { display_name: string | null } | null;
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function ThreadView({
  threadId,
  locked = false,
}: {
  threadId: string;
  locked?: boolean;
}) {
  const supabase = createClient();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("forum_posts")
      .select("id,parent_id,author_id,body,status,created_at,author:profiles(display_name)")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    setPosts((data as unknown as PostRow[]) ?? []);
    setLoading(false);
  }, [supabase, threadId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    load();
  }, [supabase, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("forum_posts").insert({
      thread_id: threadId,
      parent_id: replyTo,
      author_id: userId,
      body: draft.trim(),
      status: "visible",
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDraft("");
    setReplyTo(null);
    load();
  }

  const roots = posts.filter((p) => !p.parent_id);
  const childrenOf = (id: string) => posts.filter((p) => p.parent_id === id);

  function Post({ p, nested }: { p: PostRow; nested?: boolean }) {
    const removed = p.status === "removed";
    return (
      <div className={nested ? "ml-4 border-l-2 border-[color:var(--by-line)] pl-4" : ""}>
        <div className="py-3">
          <div className="text-xs by-muted">
            <span className="font-semibold text-[color:var(--by-ink)] uppercase tracking-[0.04em]">
              {p.author?.display_name ?? "Removed user"}
            </span>{" "}
            · {timeAgo(p.created_at)}
          </div>
          <p className="text-sm whitespace-pre-wrap mt-1 leading-relaxed">
            {removed ? <em className="opacity-60">[removed by a moderator]</em> : p.body}
          </p>
          {!removed && (
            <div className="flex gap-4 mt-1.5 text-xs by-muted">
              {userId && !locked && !nested && (
                <button
                  className="by-link decoration-transparent"
                  onClick={() => setReplyTo(replyTo === p.id ? null : p.id)}
                >
                  Reply
                </button>
              )}
              <ReportButton targetType="forum_post" targetId={p.id} />
            </div>
          )}
          {replyTo === p.id && (
            <ReplyBox
              value={draft}
              onChange={setDraft}
              onSubmit={submit}
              busy={busy}
            />
          )}
        </div>
        {childrenOf(p.id).map((c) => (
          <Post key={c.id} p={c} nested />
        ))}
      </div>
    );
  }

  return (
    <section>
      <p className="by-eyebrow mb-3">Discussion</p>
      {loading ? (
        <p className="text-sm by-muted">Loading…</p>
      ) : roots.length === 0 ? (
        <p className="text-sm by-muted">No comments yet.</p>
      ) : (
        <div className="border-t border-[color:var(--by-line)] divide-y divide-[color:var(--by-line)]">
          {roots.map((p) => (
            <Post key={p.id} p={p} />
          ))}
        </div>
      )}

      {error && <p className="by-note by-note--error mt-3">{error}</p>}

      {locked ? (
        <p className="mt-4 text-sm by-muted">This thread is locked.</p>
      ) : userId ? (
        replyTo === null && (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              maxLength={5000}
              placeholder="Add a comment…"
              className="by-field by-field--sm"
            />
            <button
              disabled={busy}
              className="by-btn by-btn--accent by-btn--sm"
            >
              {busy ? "Posting…" : "Post comment"}
            </button>
          </form>
        )
      ) : (
        <p className="mt-4 text-sm">
          <Link href="/login?next=" className="by-link font-semibold">
            Sign in
          </Link>{" "}
          to join the discussion.
        </p>
      )}
    </section>
  );
}

function ReplyBox({
  value,
  onChange,
  onSubmit,
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  busy: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        maxLength={5000}
        placeholder="Write a reply…"
        className="by-field by-field--sm"
      />
      <button disabled={busy} className="by-btn by-btn--accent by-btn--sm">
        {busy ? "Posting…" : "Reply"}
      </button>
    </form>
  );
}
