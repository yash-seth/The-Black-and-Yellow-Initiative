import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession, hasRole } from "@/lib/auth";
import { photoUrl } from "@/lib/storage";
import {
  approvePin,
  rejectPin,
  resolveReport,
  setPhotoStatus,
  setPostStatus,
  setThreadStatus,
  setUserBanned,
  setUserRole,
} from "./actions";
import type { Photo, Profile, SpeedBreaker } from "@/lib/types";

export const metadata: Metadata = { title: "Moderation" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session.userId) redirect("/login?next=/admin");
  if (!hasRole(session.profile, "moderator")) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="by-eyebrow justify-center mb-4">Restricted</p>
        <h1 className="by-title text-2xl">Not authorised</h1>
        <p className="text-sm by-muted mt-2">
          This area is for moderators only.
        </p>
        <Link
          href="/"
          className="by-btn by-btn--ghost by-btn--sm mt-6 inline-flex"
        >
          Back to the map
        </Link>
      </div>
    );
  }

  const isAdmin = hasRole(session.profile, "admin");
  const supabase = await createClient();

  const [pendingPinsRes, afterPhotosRes, reportsRes, recentPostsRes, profilesRes] =
    await Promise.all([
      supabase
        .from("speed_breakers")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      supabase
        .from("photos")
        .select("*, speed_breaker:speed_breakers(id,landmark,paint_state)")
        .eq("kind", "after")
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      supabase
        .from("reports")
        .select("*")
        .eq("resolved", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("forum_posts")
        .select("id,body,status,created_at,thread_id,author:profiles(display_name),thread:forum_threads(title)")
        .order("created_at", { ascending: false })
        .limit(30),
      isAdmin
        ? supabase.from("profiles").select("*").order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as Profile[] }),
    ]);

  const pendingPins = (pendingPinsRes.data as SpeedBreaker[]) ?? [];
  const afterPhotos =
    (afterPhotosRes.data as (Photo & {
      speed_breaker: { id: string; landmark: string | null } | null;
    })[]) ?? [];
  const reports = reportsRes.data ?? [];
  const recentPosts = (recentPostsRes.data as unknown as {
    id: string;
    body: string;
    status: string;
    created_at: string;
    thread_id: string;
    author: { display_name: string | null } | null;
    thread: { title: string } | null;
  }[]) ?? [];
  const profiles = (profilesRes.data as Profile[]) ?? [];

  // Photos for the pending pins, fetched in one query.
  const pinIds = pendingPins.map((p) => p.id);
  const { data: pinPhotoRows } = pinIds.length
    ? await supabase.from("photos").select("*").in("speed_breaker_id", pinIds)
    : { data: [] as Photo[] };
  const pinPhotos = (pinPhotoRows as Photo[]) ?? [];

  return (
    <div className="mx-auto max-w-4xl w-full px-4 py-10 space-y-14">
      <div>
        <p className="by-eyebrow mb-4">Moderator tools</p>
        <h1 className="by-title text-3xl sm:text-4xl">Moderation</h1>
        <hr className="by-rule mt-6" />
      </div>

      {/* -------- Pending pins -------- */}
      <section>
        <p className="by-eyebrow mb-4">
          Reports awaiting review ({pendingPins.length})
        </p>
        {pendingPins.length === 0 && (
          <p className="text-sm by-muted">Nothing in the queue. 🎉</p>
        )}
        <div className="space-y-5">
          {pendingPins.map((pin) => (
            <div key={pin.id} className="by-card p-5">
              <div className="flex flex-wrap gap-4 justify-between">
                <div>
                  <div className="by-title text-base">
                    {pin.landmark || "(no landmark given)"}
                  </div>
                  <div className="text-xs by-muted mt-0.5">
                    {pin.severity} · {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)} ·{" "}
                    {new Date(pin.created_at).toLocaleString()}
                  </div>
                </div>
                <a
                  className="text-xs by-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://www.openstreetmap.org/?mlat=${pin.lat}&mlon=${pin.lng}#map=18/${pin.lat}/${pin.lng}`}
                >
                  Check location
                </a>
              </div>

              {pin.description && (
                <p className="text-sm mt-2 whitespace-pre-wrap leading-relaxed">
                  {pin.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {pinPhotos
                  .filter((ph) => ph.speed_breaker_id === pin.id)
                  .map((ph) => (
                    <a
                      key={ph.id}
                      href={photoUrl(ph.storage_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="report"
                        src={photoUrl(ph.storage_path)}
                        className="h-28 w-28 object-cover border border-[color:var(--by-line)]"
                      />
                    </a>
                  ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <form action={approvePin}>
                  <input type="hidden" name="id" value={pin.id} />
                  <button className="by-btn by-btn--sm bg-[color:var(--by-ok)] text-white border-[color:var(--by-ok)]">
                    Approve
                  </button>
                </form>
                <form action={rejectPin} className="flex gap-2 items-center">
                  <input type="hidden" name="id" value={pin.id} />
                  <input
                    name="reason"
                    placeholder="Reason (optional)"
                    className="by-field by-field--sm"
                  />
                  <button className="by-btn by-btn--sm bg-[color:var(--by-error)] text-white border-[color:var(--by-error)]">
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* -------- After photos -------- */}
      <section>
        <p className="by-eyebrow mb-4">
          &ldquo;Painted&rdquo; confirmations ({afterPhotos.length})
        </p>
        {afterPhotos.length === 0 && (
          <p className="text-sm by-muted">None pending.</p>
        )}
        <div className="space-y-4">
          {afterPhotos.map((ph) => (
            <div
              key={ph.id}
              className="by-card p-4 flex flex-wrap gap-4 items-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="after"
                src={photoUrl(ph.storage_path)}
                className="h-28 w-28 object-cover border border-[color:var(--by-line)]"
              />
              <div className="flex-1 min-w-[12rem]">
                <Link
                  href={`/pin/${ph.speed_breaker?.id}`}
                  className="text-sm font-semibold by-link"
                >
                  {ph.speed_breaker?.landmark || "Speed breaker"}
                </Link>
                <div className="text-xs by-muted">
                  uploaded {new Date(ph.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <form action={setPhotoStatus}>
                  <input type="hidden" name="id" value={ph.id} />
                  <input type="hidden" name="status" value="approved" />
                  <button className="by-btn by-btn--sm bg-[color:var(--by-ok)] text-white border-[color:var(--by-ok)]">
                    Confirm painted
                  </button>
                </form>
                <form action={setPhotoStatus}>
                  <input type="hidden" name="id" value={ph.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <button className="by-btn by-btn--ghost by-btn--sm">
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* -------- Reports -------- */}
      <section>
        <p className="by-eyebrow mb-4">Open reports ({reports.length})</p>
        {reports.length === 0 && (
          <p className="text-sm by-muted">No open reports.</p>
        )}
        <ul className="space-y-2">
          {reports.map((r) => (
            <li
              key={r.id}
              className="by-card p-3 text-sm flex justify-between gap-3"
            >
              <div>
                <div className="font-semibold">
                  {r.target_type === "speed_breaker" ? (
                    <Link href={`/pin/${r.target_id}`} className="by-link">
                      speed breaker
                    </Link>
                  ) : (
                    <span>forum post</span>
                  )}
                </div>
                <div className="by-muted">{r.reason}</div>
                <div className="text-xs by-muted">
                  {new Date(r.created_at).toLocaleString()} · {r.target_id}
                </div>
              </div>
              <form action={resolveReport}>
                <input type="hidden" name="id" value={r.id} />
                <button className="by-btn by-btn--ghost by-btn--sm h-fit">
                  Resolve
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      {/* -------- Recent forum posts -------- */}
      <section>
        <p className="by-eyebrow mb-4">Recent forum posts</p>
        <ul className="space-y-2">
          {recentPosts.map((p) => (
            <li key={p.id} className="by-card p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-xs by-muted">
                  {p.author?.display_name ?? "?"} in{" "}
                  <Link
                    href={`/forum/thread/${p.thread_id}`}
                    className="by-link"
                  >
                    {p.thread?.title ?? "thread"}
                  </Link>{" "}
                  · {new Date(p.created_at).toLocaleString()}
                  {p.status !== "visible" && (
                    <span className="ml-1 font-semibold text-[color:var(--by-error)]">
                      [{p.status}]
                    </span>
                  )}
                </span>
                <form action={setPostStatus}>
                  <input type="hidden" name="id" value={p.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={p.status === "removed" ? "visible" : "removed"}
                  />
                  <button className="by-btn by-btn--ghost by-btn--sm">
                    {p.status === "removed" ? "Restore" : "Remove"}
                  </button>
                </form>
              </div>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                {p.body}
              </p>
              <form action={setThreadStatus} className="mt-1">
                <input type="hidden" name="id" value={p.thread_id} />
                <input type="hidden" name="status" value="locked" />
                <button className="text-xs by-link by-muted">
                  Lock thread
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      {/* -------- Users (admin only) -------- */}
      {isAdmin && (
        <section>
          <p className="by-eyebrow mb-4">Users</p>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[32rem]">
            <thead>
              <tr className="text-left by-muted uppercase text-xs tracking-[0.06em]">
                <th className="py-2 font-semibold">Name</th>
                <th className="font-semibold">Role</th>
                <th className="font-semibold">Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((u) => (
                <tr key={u.id} className="border-t border-[color:var(--by-line)]">
                  <td className="py-2">
                    {u.display_name ?? u.id.slice(0, 8)}
                    {u.is_banned && (
                      <span className="ml-1 text-[color:var(--by-error)] font-semibold">
                        banned
                      </span>
                    )}
                  </td>
                  <td>
                    <form action={setUserRole} className="flex gap-1.5 items-center">
                      <input type="hidden" name="userId" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="by-field by-field--sm w-auto"
                      >
                        <option value="user">user</option>
                        <option value="moderator">moderator</option>
                        <option value="admin">admin</option>
                      </select>
                      <button className="by-btn by-btn--ghost by-btn--sm">
                        set
                      </button>
                    </form>
                  </td>
                  <td className="text-xs by-muted">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <form action={setUserBanned}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input
                        type="hidden"
                        name="banned"
                        value={(!u.is_banned).toString()}
                      />
                      <button className="by-btn by-btn--ghost by-btn--sm">
                        {u.is_banned ? "Unban" : "Ban"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      )}
    </div>
  );
}
