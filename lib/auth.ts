import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

const RANK: Record<Role, number> = { user: 0, moderator: 1, admin: 2 };

export interface SessionInfo {
  userId: string | null;
  profile: Profile | null;
}

/** Returns the signed-in user's id and profile row, or nulls when anonymous. */
export async function getSession(): Promise<SessionInfo> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { userId: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { userId: user.id, profile: (profile as Profile) ?? null };
}

export function hasRole(profile: Profile | null, min: Role): boolean {
  if (!profile || profile.is_banned) return false;
  return RANK[profile.role] >= RANK[min];
}

/** Throws-style guard for route handlers: returns the session or null. */
export async function requireRole(min: Role): Promise<SessionInfo | null> {
  const session = await getSession();
  return hasRole(session.profile, min) ? session : null;
}
