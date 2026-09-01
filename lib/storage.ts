import { PHOTOS_BUCKET } from "@/lib/config";

/** Public URL for an object in the photos bucket. */
export function photoUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${PHOTOS_BUCKET}/${storagePath}`;
}
