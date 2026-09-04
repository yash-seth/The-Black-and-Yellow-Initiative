import type { Metadata } from "next";

export const metadata: Metadata = { title: "Community guidelines" };

export default function GuidelinesPage() {
  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-12">
      <p className="by-eyebrow mb-4">Community</p>
      <h1 className="by-title text-3xl sm:text-4xl">Community guidelines</h1>
      <hr className="by-rule my-6" />
      <div className="by-prose">
      <ul>
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
      <p className="by-muted" style={{ marginTop: "1.25rem" }}>
        Use the &ldquo;Report&rdquo; link on any pin or post to flag something
        for a moderator.
      </p>
      </div>
    </div>
  );
}
