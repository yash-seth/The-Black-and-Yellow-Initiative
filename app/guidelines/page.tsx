import type { Metadata } from "next";

export const metadata: Metadata = { title: "Community guidelines" };

export default function GuidelinesPage() {
  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-10 space-y-4">
      <h1 className="text-2xl font-extrabold">Community guidelines</h1>
      <ul className="text-sm list-disc pl-5 space-y-2">
        <li>
          <strong>Report real hazards only.</strong> This is for speed breakers
          that are unmarked, unsigned, or dangerously built &mdash; not for
          every bump in the road.
        </li>
        <li>
          <strong>Photos must be your own</strong> and must show the speed
          breaker or its surroundings. No people as the subject, no unrelated
          images.
        </li>
        <li>
          <strong>Be accurate with the pin.</strong> Place it on the actual
          speed breaker, not roughly nearby.
        </li>
        <li>
          <strong>Keep the forum civil.</strong> No harassment, no personal
          attacks, no doxxing of officials or residents. Criticise decisions,
          not people.
        </li>
        <li>
          <strong>No spam or promotion.</strong>
        </li>
        <li>
          Moderators may remove reports, posts, or accounts that break these
          rules.
        </li>
      </ul>
      <p className="text-sm text-black/60 dark:text-white/60">
        Use the &ldquo;Report&rdquo; link on any pin or post to flag something
        for a moderator.
      </p>
    </div>
  );
}
