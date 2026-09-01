import type { Metadata } from "next";
import { PinForm } from "@/components/PinForm";

export const metadata: Metadata = {
  title: "Report a speed breaker",
  description:
    "Pin the location of a dangerous, unmarked speed breaker and add photos.",
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-8">
      <h1 className="text-2xl font-extrabold mb-1">Report a speed breaker</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mb-6">
        No account needed. Your report is checked by a moderator before it shows
        on the map. Please only report speed breakers that are genuinely unmarked
        or dangerous.
      </p>
      <PinForm />
    </div>
  );
}
