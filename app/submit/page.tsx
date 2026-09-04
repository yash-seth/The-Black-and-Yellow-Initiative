import type { Metadata } from "next";
import { PinForm } from "@/components/PinForm";

export const metadata: Metadata = {
  title: "Report a speed breaker",
  description:
    "Pin the location of a dangerous, unmarked speed breaker and add photos.",
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-10">
      <p className="by-eyebrow mb-4">New report</p>
      <h1 className="by-title text-3xl sm:text-4xl mb-3">
        Report a speed breaker
      </h1>
      <hr className="by-rule my-5" />
      <p className="by-prose by-muted mb-8">
        No account needed. Your report is checked by a moderator before it shows
        on the map. Please only report speed breakers that are genuinely unmarked
        or dangerous.
      </p>
      <PinForm />
    </div>
  );
}
