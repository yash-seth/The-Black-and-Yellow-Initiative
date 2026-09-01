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
        <h1 className="text-xl font-bold">Not authorised</h1>
        <p className="text-sm text-black/60 dark:text-white/60 mt-2">
          This area is for moderators only.
        </p>
        <Link href="/" className="underline text-sm mt-4 inline-block">
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
    <div className="mx-auto max-w-4xl w-full px-4 py-8 space-y-12">
      <h1 className="text-2xl font-extrabold">Moderation</h1>

      {/* -------- Pending pins -------- */}
      <section>
        <h2 className="font-bold text-lg mb-3">
          Speed breaker reports awaiting review ({pendingPins.length})
        </h2>
        {pendingPins.length === 0 && (
          <p className="text-sm text-black/50">Nothing in the queue. 🎉</p>
        )}
        <div className="space-y-6">
          {pendingPins.map((pin) => (
            <div
              key={pin.id}
              className="rounded-lg border border-black/10 dark:border-white/10 p-4"
            >
              <div className="flex flex-wrap gap-4 justify-between">
                <div>
                  <div className="font-semibold">
                    {pin.landmark || "(no landmark given)"}
                  </div>
                  <div className="text-xs text-black/50 dark:text-white/50">
                    {pin.severity} · {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)} ·{" "}
                    {new Date(pin.created_at).toLocaleString()}
                  </div>
                </div>
                <a
                  className="text-xs underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://www.openstreetmap.org/?mlat=${pin.lat}&mlon=${pin.lng}#map=18/${pin.lat}/${pin.lng}`}
                >
                  Check location
                </a>
              </div>

              {pin.description && (
                <p className="text-sm mt-2 whitespace-pre-wrap">
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
                        className="h-28 w-28 object-cover rounded border border-black/10"
                      />
                    </a>
                  ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <form action={approvePin}>
                  <input type="hidden" name="id" value={pin.id} />
                  <button className="rounded bg-green-600 text-white px-4 py-1.5 text-sm font-semibold">
                    Approve
                  </button>
                </form>
                <form action={rejectPin} className="flex gap-2 items-center">
                  <input type="hidden" name="id" value={pin.id} />
                  <input
                    name="reason"
                    placeholder="Reason (optional)"
                    className="rounded border border-black/15 px-2 py-1 text-sm bg-transparent"
                  />
                  <button className="rounded bg-red-600 text-white px-4 py-1.5 text-sm font-semibold">
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
        <h2 className="font-bold text-lg mb-3">
          &ldquo;Painted&rdquo; confirmations ({afterPhotos.length})
        </h2>
        {afterPhotos.length === 0 && (
          <p className="text-sm text-black/50">None pending.</p>
        )}
        <div className="space-y-4">
          {afterPhotos.map((ph) => (
            <div
              key={ph.id}
              className="rounded-lg border border-black/10 dark:border-white/10 p-4 flex flex-wrap gap-4 items-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="after"
                src={photoUrl(ph.storage_path)}
                className="h-28 w-28 object-cover rounded"
              />
              <div className="flex-1 min-w-[12rem]">
                <Link
                  href={`/pin/${ph.speed_breaker?.id}`}
                  className="text-sm font-medium underline"
                >
                  {ph.speed_breaker?.landmark || "Speed breaker"}
                </Link>
                <div className="text-xs text-black/50">
                  uploaded {new Date(ph.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <form action={setPhotoStatus}>
                  <input type="hidden" name="id" value={ph.id} />
                  <input type="hidden" name="status" value="approved" />
                  <button className="rounded bg-green-600 text-white px-3 py-1.5 text-sm font-semibold">
                    Confirm painted
                  </button>
                </form>
                <form action={setPhotoStatus}>
                  <input type="hidden" name="id" value={ph.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <button className="rounded bg-black/10 dark:bg-white/10 px-3 py-1.5 text-sm">
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
        <h2 className="font-bold text-lg mb-3">Open reports ({reports.length})</h2>
        {reports.length === 0 && (
          <p className="text-sm text-black/50">No open reports.</p>
        )}
        <ul className="space-y-2">
          {reports.map((r) => (
            <li
              key={r.id}
              className="rounded border border-black/10 dark:border-white/10 p-3 text-sm flex justify-between gap-3"
            >
              <div>
                <div className="font-medium">
                  {r.target_type === "speed_breaker" ? (
                    <Link href={`/pin/${r.target_id}`} className="underline">
                      speed breaker
                    </Link>
                  ) : (
                    <span>forum post</span>
                  )}
                </div>
                <div className="text-black/60 dark:text-white/60">{r.reason}</div>
                <div className="text-xs text-black/40">
                  {new Date(r.created_at).toLocaleString()} · {r.target_id}
                </div>
              </div>
              <form action={resolveReport}>
                <input type="hidden" name="id" value={r.id} />
                <button className="rounded bg-black/10 dark:bg-white/10 px-3 py-1 text-xs h-fit">
                  Resolve
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      {/* -------- Recent forum posts -------- */}
      <section>
        <h2 className="font-bold text-lg mb-3">Recent forum posts</h2>
        <ul className="space-y-2">
          {recentPosts.map((p) => (
            <li
              key={p.id}
              className="rounded border border-black/10 dark:border-white/10 p-3 text-sm"
            >
              <div className="flex justify-between gap-3">
                <span className="text-xs text-black/50">
                  {p.author?.display_name ?? "?"} in{" "}
                  <Link
                    href={`/forum/thread/${p.thread_id}`}
                    className="underline"
                  >
                    {p.thread?.title ?? "thread"}
                  </Link>{" "}
                  · {new Date(p.created_at).toLocaleString()}
                  {p.status !== "visible" && (
                    <span className="ml-1 font-semibold text-red-600">
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
                  <button className="rounded bg-black/10 dark:bg-white/10 px-2 py-0.5 text-xs">
                    {p.status === "removed" ? "Restore" : "Remove"}
                  </button>
                </form>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{p.body}</p>
              <form action={setThreadStatus} className="mt-1">
                <input type="hidden" name="id" value={p.thread_id} />
                <input type="hidden" name="status" value="locked" />
                <button className="text-xs underline text-black/40">
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
          <h2 className="font-bold text-lg mb-3">Users</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-black/50">
                <th className="py-1">Name</th>
                <th>Role</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((u) => (
                <tr key={u.id} className="border-t border-black/10">
                  <td className="py-1.5">
                    {u.display_name ?? u.id.slice(0, 8)}
                    {u.is_banned && (
                      <span className="ml-1 text-red-600 font-semibold">
                        banned
                      </span>
                    )}
                  </td>
                  <td>
                    <form action={setUserRole} className="flex gap-1">
                      <input type="hidden" name="userId" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="bg-transparent border border-black/15 rounded px-1 py-0.5"
                      >
                        <option value="user">user</option>
                        <option value="moderator">moderator</option>
                        <option value="admin">admin</option>
                      </select>
                      <button className="rounded bg-black/10 dark:bg-white/10 px-2 text-xs">
                        set
                      </button>
                    </form>
                  </td>
                  <td className="text-xs text-black/40">
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
                      <button className="rounded bg-black/10 dark:bg-white/10 px-2 py-0.5 text-xs">
                        {u.is_banned ? "Unban" : "Ban"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
