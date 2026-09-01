import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { photoUrl } from "@/lib/storage";
import { ThreadView } from "@/components/ThreadView";
import { AfterPhotoUpload } from "@/components/AfterPhotoUpload";
import { ReportButton } from "@/components/ReportButton";
import type { Photo, SpeedBreaker } from "@/lib/types";

const SEVERITY_LABEL = {
  low: "Low",
  medium: "Medium",
  high: "High",
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("speed_breakers")
    .select("landmark,description")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { title: "Speed breaker" };
  return {
    title: data.landmark || "Speed breaker report",
    description: data.description ?? undefined,
  };
}

export default async function PinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: sb } = await supabase
    .from("speed_breakers")
    .select("*")
    .eq("id", id)
    .maybeSingle<SpeedBreaker>();

  if (!sb) notFound();

  const { data: photoRows } = await supabase
    .from("photos")
    .select("*")
    .eq("speed_breaker_id", id)
    .order("created_at", { ascending: true });
  const photos = (photoRows as Photo[]) ?? [];
  const reportPhotos = photos.filter(
    (p) => p.kind === "report" && p.status === "approved",
  );
  const afterPhotos = photos.filter(
    (p) => p.kind === "after" && p.status === "approved",
  );

  const { data: thread } = await supabase
    .from("forum_threads")
    .select("id,status")
    .eq("speed_breaker_id", id)
    .maybeSingle();

  const painted = sb.paint_state === "marked";

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-8 space-y-6">
      <Link href="/" className="text-sm underline">
        ← Back to the map
      </Link>

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-extrabold">
          {sb.landmark || "Speed breaker report"}
        </h1>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
            painted
              ? "bg-green-600 text-white"
              : "hazard-stripe text-white"
          }`}
        >
          {painted ? "Painted ✓" : "Needs painting"}
        </span>
      </div>

      {sb.status !== "approved" && (
        <p className="rounded border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm">
          This report is <strong>{sb.status}</strong> and not yet public.
        </p>
      )}

      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-black/50 dark:text-white/50">Severity</dt>
          <dd className="font-medium">{SEVERITY_LABEL[sb.severity]}</dd>
        </div>
        <div>
          <dt className="text-black/50 dark:text-white/50">Reported</dt>
          <dd className="font-medium">
            {new Date(sb.created_at).toLocaleDateString()}
          </dd>
        </div>
        <div>
          <dt className="text-black/50 dark:text-white/50">Coordinates</dt>
          <dd className="font-medium">
            {sb.lat.toFixed(5)}, {sb.lng.toFixed(5)}
          </dd>
        </div>
      </dl>

      {sb.description && (
        <p className="text-sm whitespace-pre-wrap">{sb.description}</p>
      )}

      <div className="flex gap-3 text-sm">
        <a
          href={`https://www.openstreetmap.org/?mlat=${sb.lat}&mlon=${sb.lng}#map=18/${sb.lat}/${sb.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Open in OpenStreetMap
        </a>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${sb.lat},${sb.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Open in Google Maps
        </a>
        <ReportButton targetType="speed_breaker" targetId={sb.id} />
      </div>

      {reportPhotos.length > 0 && (
        <div>
          <h2 className="font-bold mb-2">Photos</h2>
          <div className="grid grid-cols-2 gap-2">
            {reportPhotos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                alt="Speed breaker"
                src={photoUrl(p.storage_path)}
                className="w-full rounded-lg object-cover aspect-4/3"
              />
            ))}
          </div>
        </div>
      )}

      {afterPhotos.length > 0 && (
        <div>
          <h2 className="font-bold mb-2 text-green-700 dark:text-green-400">
            After painting
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {afterPhotos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                alt="Speed breaker after painting"
                src={photoUrl(p.storage_path)}
                className="w-full rounded-lg object-cover aspect-4/3"
              />
            ))}
          </div>
        </div>
      )}

      {sb.status === "approved" && !painted && (
        <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
          <h2 className="font-bold mb-1">Has this been painted?</h2>
          <p className="text-sm text-black/60 dark:text-white/60 mb-3">
            If you&apos;ve seen this speed breaker painted in black and yellow,
            upload photos and a moderator will confirm it.
          </p>
          <AfterPhotoUpload speedBreakerId={sb.id} />
        </div>
      )}

      {thread && thread.status !== "removed" ? (
        <ThreadView threadId={thread.id} locked={thread.status === "locked"} />
      ) : (
        <p className="text-sm text-black/50">
          Discussion opens once this report is approved.
        </p>
      )}
    </div>
  );
}
