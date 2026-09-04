import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md w-full px-4 py-14">
      <p className="by-eyebrow mb-4">Account</p>
      <h1 className="by-title text-3xl sm:text-4xl">Sign in</h1>
      <hr className="by-rule my-5" />
      <p className="by-prose by-muted mb-6">
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
