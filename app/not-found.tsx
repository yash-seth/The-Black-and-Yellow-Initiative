import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-3xl font-extrabold">Not found</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mt-2">
        That page or report doesn&apos;t exist, or it isn&apos;t public yet.
      </p>
      <Link href="/" className="underline text-sm mt-4 inline-block">
        Back to the map
      </Link>
    </div>
  );
}
