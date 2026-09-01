import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-10 prose-sm space-y-4">
      <h1 className="text-2xl font-extrabold">About Black &amp; Yellow</h1>
      <p className="text-sm leading-relaxed">
        Speed breakers that are not painted in the regulation black-and-yellow
        pattern, and that carry no warning sign, are a genuine road-safety
        hazard &mdash; especially at night and for two-wheelers. This is a
        community project to map those speed breakers, bring attention to them,
        and track the ones that get fixed.
      </p>
      <h2 className="font-bold">How it works</h2>
      <ol className="text-sm list-decimal pl-5 space-y-1">
        <li>
          Anyone can <Link href="/submit" className="underline">report a speed
          breaker</Link> &mdash; drop a pin, add photos, no account needed.
        </li>
        <li>
          A volunteer moderator reviews each report before it appears on the
          public map.
        </li>
        <li>
          Once it&apos;s on the map, it gets its own discussion thread. Share
          updates, tag the local authority, coordinate.
        </li>
        <li>
          When a speed breaker is finally painted, upload &ldquo;after&rdquo;
          photos. A moderator confirms it, the pin turns green, and it&apos;s
          celebrated in the <Link href="/forum/successes" className="underline">
          Successes</Link> board.
        </li>
      </ol>
      <p className="text-sm">
        This site is run at cost by volunteers. All report data is public and
        crowd-sourced; treat it as indicative, not authoritative.
      </p>
    </div>
  );
}
