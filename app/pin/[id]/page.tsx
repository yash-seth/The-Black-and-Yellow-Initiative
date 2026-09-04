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
    <div className="mx-auto max-w-2xl w-full px-4 py-10 space-y-6">
      <Link href="/" className="by-link text-sm by-muted">
        ← Back to the map
      </Link>

      <div className="flex items-start justify-between gap-4">
        <h1 className="by-title text-2xl sm:text-3xl">
          {sb.landmark || "Speed breaker report"}
        </h1>
        <span
          className={`shrink-0 by-chip ${
            painted ? "by-chip--ok" : "by-chip--hazard"
          }`}
        >
          {painted ? "Painted ✓" : "Needs painting"}
        </span>
      </div>

      {sb.status !== "approved" && (
        <p className="by-note by-note--warn">
          This report is <strong>{sb.status}</strong> and not yet public.
        </p>
      )}

      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div className="border-t-2 border-[color:var(--by-line-strong)] pt-2">
          <dt className="text-[11px] font-bold uppercase tracking-[0.1em] by-muted mb-1">
            Severity
          </dt>
          <dd className="font-semibold">{SEVERITY_LABEL[sb.severity]}</dd>
        </div>
        <div className="border-t-2 border-[color:var(--by-line-strong)] pt-2">
          <dt className="text-[11px] font-bold uppercase tracking-[0.1em] by-muted mb-1">
            Reported
          </dt>
          <dd className="font-semibold">
            {new Date(sb.created_at).toLocaleDateString()}
          </dd>
        </div>
        <div className="border-t-2 border-[color:var(--by-line-strong)] pt-2">
          <dt className="text-[11px] font-bold uppercase tracking-[0.1em] by-muted mb-1">
            Coordinates
          </dt>
          <dd className="font-semibold tabular-nums">
            {sb.lat.toFixed(5)}, {sb.lng.toFixed(5)}
          </dd>
        </div>
      </dl>

      {sb.description && (
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {sb.description}
        </p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm items-center">
        <a
          href={`https://www.openstreetmap.org/?mlat=${sb.lat}&mlon=${sb.lng}#map=18/${sb.lat}/${sb.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="by-link"
        >
          Open in OpenStreetMap
        </a>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${sb.lat},${sb.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="by-link"
        >
          Open in Google Maps
        </a>
        <ReportButton targetType="speed_breaker" targetId={sb.id} />
      </div>

      {reportPhotos.length > 0 && (
        <div>
          <p className="by-eyebrow mb-3">Photos</p>
          <div className="grid grid-cols-2 gap-2">
            {reportPhotos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                alt="Speed breaker"
                src={photoUrl(p.storage_path)}
                className="w-full object-cover aspect-4/3 border border-[color:var(--by-line)]"
              />
            ))}
          </div>
        </div>
      )}

      {afterPhotos.length > 0 && (
        <div>
          <p className="by-eyebrow mb-3" style={{ color: "var(--by-ok)" }}>
            After painting
          </p>
          <div className="grid grid-cols-2 gap-2">
            {afterPhotos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                alt="Speed breaker after painting"
                src={photoUrl(p.storage_path)}
                className="w-full object-cover aspect-4/3 border border-[color:var(--by-line)]"
              />
            ))}
          </div>
        </div>
      )}

      {sb.status === "approved" && !painted && (
        <div className="by-card p-5">
          <p className="by-eyebrow mb-2">Has this been painted?</p>
          <p className="text-sm by-muted mb-4">
            If you&apos;ve seen this speed breaker painted in black and yellow,
            upload photos and a moderator will confirm it.
          </p>
          <AfterPhotoUpload speedBreakerId={sb.id} />
        </div>
      )}

      <hr className="by-rule" />

      {thread && thread.status !== "removed" ? (
        <ThreadView threadId={thread.id} locked={thread.status === "locked"} />
      ) : (
        <p className="text-sm by-muted">
          Discussion opens once this report is approved.
        </p>
      )}
    </div>
  );
}
