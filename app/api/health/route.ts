import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Keep-alive + health endpoint. The GitHub Action pings this every few days so
 * the free Supabase project never pauses. Runs a trivial query to touch the DB.
 */
export async function GET(request: Request) {
  const secret = process.env.HEALTH_PING_SECRET;
  const provided = new URL(request.url).searchParams.get("secret");

  const admin = createAdminClient();
  const { error } = await admin
    .from("forum_categories")
    .select("id", { count: "exact", head: true });

  const ok = !error;
  return NextResponse.json(
    {
      ok,
      db: ok ? "up" : "down",
      pinged: secret && provided === secret ? "authorised" : "anonymous",
      at: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
