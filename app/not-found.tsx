import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="by-eyebrow justify-center mb-4">Error 404</p>
      <h1 className="by-title text-4xl">Not found</h1>
      <p className="by-muted text-sm mt-3">
        That page or report doesn&apos;t exist, or it isn&apos;t public yet.
      </p>
      <Link
        href="/"
        className="by-btn by-btn--ghost by-btn--sm mt-6 inline-flex"
      >
        Back to the map
      </Link>
    </div>
  );
}
