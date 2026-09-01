"use client";

import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if ((!url || !anonKey) && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set — the app will not be able to load data.",
  );
}

/**
 * Supabase client for Client Components. Falls back to inert placeholder values
 * when env vars are missing so a build without secrets still prerenders; real
 * values are required for anything to actually work.
 */
export function createClient() {
  return createBrowserClient(
    url || "https://placeholder.supabase.co",
    anonKey || "placeholder-anon-key",
  );
}
