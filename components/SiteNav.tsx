"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

export function SiteNav() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setEmail(user?.email ?? null);
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (active) setRole((data?.role as Role) ?? "user");
      } else {
        setRole(null);
      }
    }

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="flex items-center gap-4 text-sm font-medium">
      <Link href="/submit" className="hover:underline">
        Report
      </Link>
      <Link href="/forum" className="hover:underline">
        Forum
      </Link>
      {(role === "moderator" || role === "admin") && (
        <Link href="/admin" className="hover:underline">
          Admin
        </Link>
      )}
      {email ? (
        <button
          onClick={signOut}
          className="rounded bg-black/10 dark:bg-white/10 px-3 py-1 hover:bg-black/20"
          title={email}
        >
          Sign out
        </button>
      ) : (
        <Link
          href="/login"
          className="rounded bg-[color:var(--by-yellow)] text-black px-3 py-1 font-semibold"
        >
          Sign in
        </Link>
      )}
    </nav>
  );
}
