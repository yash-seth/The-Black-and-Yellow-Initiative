import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md w-full px-4 py-12">
      <h1 className="text-2xl font-extrabold mb-2">Sign in</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">
        You only need an account to take part in the forum. Reporting a speed
        breaker on the map does not require signing in. We&apos;ll email you a
        one-time link — no password.
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
