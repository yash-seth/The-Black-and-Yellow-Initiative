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
    <nav className="flex items-center gap-3 sm:gap-5 text-[13px] font-semibold uppercase tracking-[0.04em]">
      <Link href="/submit" className="by-link decoration-transparent">
        Report
      </Link>
      <Link href="/forum" className="by-link decoration-transparent">
        Forum
      </Link>
      {(role === "moderator" || role === "admin") && (
        <Link href="/admin" className="by-link decoration-transparent">
          Admin
        </Link>
      )}
      {email ? (
        <button
          onClick={signOut}
          className="by-btn by-btn--ghost by-btn--sm"
          title={email}
        >
          Sign out
        </button>
      ) : (
        <Link href="/login" className="by-btn by-btn--accent by-btn--sm">
          Sign in
        </Link>
      )}
    </nav>
  );
}
