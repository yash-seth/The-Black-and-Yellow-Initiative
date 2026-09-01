import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyCaptcha } from "@/lib/captcha";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { PHOTOS_BUCKET, rateLimits } from "@/lib/config";
import type { Severity } from "@/lib/types";

const SEVERITIES: Severity[] = ["low", "medium", "high"];
const MAX_PHOTOS = 4;
const MAX_BYTES = 1_200_000;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad("Invalid form data.");
  }

  const lat = Number(form.get("lat"));
  const lng = Number(form.get("lng"));
  const landmark = String(form.get("landmark") ?? "").trim().slice(0, 200);
  const description = String(form.get("description") ?? "").trim().slice(0, 2000);
  const severity = String(form.get("severity") ?? "medium") as Severity;
  const captchaToken = String(form.get("captchaToken") ?? "");
  const submitterToken = String(form.get("submitterToken") ?? "").slice(0, 64);
  const photos = form.getAll("photos").filter((p): p is File => p instanceof File);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return bad("Bad latitude.");
  if (!Number.isFinite(lng) || lng < -180 || lng > 180)
    return bad("Bad longitude.");
  if (!SEVERITIES.includes(severity)) return bad("Bad severity.");
  if (photos.length < 1) return bad("At least one photo is required.");
  if (photos.length > MAX_PHOTOS) return bad("Too many photos.");
  for (const p of photos) {
    if (!OK_TYPES.includes(p.type)) return bad("Unsupported image type.");
    if (p.size > MAX_BYTES) return bad("An image is too large.");
  }

  const ip = clientIp(request.headers);

  if (!(await verifyCaptcha(captchaToken, ip)))
    return bad("Captcha verification failed.", 400);

  const gates = await Promise.all([
    checkRateLimit(`ip:${ip}`, "pin", rateLimits.pinsPerHour, 3600),
    checkRateLimit(`ip:${ip}`, "pin_day", rateLimits.pinsPerDay, 86400),
    checkRateLimit(
      `tok:${submitterToken || ip}`,
      "pin",
      rateLimits.pinsPerHour,
      3600,
    ),
  ]);
  if (gates.some((ok) => !ok))
    return bad("You have submitted too many reports recently. Try later.", 429);

  // Attribute to the logged-in user when there is one.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  const { data: sb, error: sbErr } = await admin
    .from("speed_breakers")
    .insert({
      lat,
      lng,
      landmark: landmark || null,
      description: description || null,
      severity,
      status: "pending",
      submitter_id: user?.id ?? null,
      submitter_token: submitterToken || null,
    })
    .select("id")
    .single();

  if (sbErr || !sb) return bad("Could not save the report.", 500);

  const uploaded: string[] = [];
  for (const photo of photos) {
    const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    const path = `${sb.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from(PHOTOS_BUCKET)
      .upload(path, photo, { contentType: photo.type, upsert: false });
    if (upErr) continue;
    uploaded.push(path);
    await admin.from("photos").insert({
      speed_breaker_id: sb.id,
      storage_path: path,
      kind: "report",
      status: "pending",
      uploader_id: user?.id ?? null,
    });
  }

  if (uploaded.length === 0) {
    await admin.from("speed_breakers").delete().eq("id", sb.id);
    return bad("Photo upload failed. Please try again.", 500);
  }

  return NextResponse.json({ id: sb.id });
}
