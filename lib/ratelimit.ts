import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limit backed by the `rate_limits` table + `check_rate_limit`
 * SQL function (see supabase/migrations). Returns true when the action is
 * allowed, false when the caller is over the limit.
 */
export async function checkRateLimit(
  key: string,
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  // Fail closed on error to avoid abuse when the DB misbehaves.
  if (error) return false;
  return data === true;
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
