import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { PHOTOS_BUCKET } from "@/lib/config";

const MAX_PHOTOS = 4;
const MAX_BYTES = 1_200_000;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form." }, { status: 400 });
  }

  const speedBreakerId = String(form.get("speedBreakerId") ?? "");
  const photos = form.getAll("photos").filter((p): p is File => p instanceof File);

  if (!/^[0-9a-f-]{36}$/i.test(speedBreakerId))
    return NextResponse.json({ error: "Bad id." }, { status: 400 });
  if (photos.length < 1 || photos.length > MAX_PHOTOS)
    return NextResponse.json({ error: "Add 1–4 photos." }, { status: 400 });
  for (const p of photos) {
    if (!OK_TYPES.includes(p.type) || p.size > MAX_BYTES)
      return NextResponse.json({ error: "Bad image." }, { status: 400 });
  }

  if (!(await checkRateLimit(`user:${user.id}`, "after", 10, 3600)))
    return NextResponse.json({ error: "Too many uploads." }, { status: 429 });

  const admin = createAdminClient();

  // Confirm the pin exists and is approved.
  const { data: sb } = await admin
    .from("speed_breakers")
    .select("id,status")
    .eq("id", speedBreakerId)
    .maybeSingle();
  if (!sb || sb.status !== "approved")
    return NextResponse.json({ error: "Unknown speed breaker." }, { status: 404 });

  let saved = 0;
  for (const photo of photos) {
    const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    const path = `${speedBreakerId}/after-${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from(PHOTOS_BUCKET)
      .upload(path, photo, { contentType: photo.type });
    if (upErr) continue;
    await admin.from("photos").insert({
      speed_breaker_id: speedBreakerId,
      storage_path: path,
      kind: "after",
      status: "pending",
      uploader_id: user.id,
    });
    saved++;
  }

  if (saved === 0)
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  return NextResponse.json({ ok: true, saved });
}
