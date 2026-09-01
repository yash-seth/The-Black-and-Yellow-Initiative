import type { Metadata } from "next";
import Link from "next/link";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { siteUrl } from "@/lib/config";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Black & Yellow — map the speed breakers that need painting",
    template: "%s — Black & Yellow",
  },
  description:
    "A community map of dangerous, unmarked speed breakers. Drop a pin, add photos, and help get them painted in regulation black and yellow.",
  openGraph: {
    title: "Black & Yellow",
    description:
      "Map the dangerous speed breakers that need painting in black and yellow.",
    url: siteUrl,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="hazard-stripe">
          <div className="bg-white/90 dark:bg-black/80 backdrop-blur">
            <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
              <Link href="/" className="font-extrabold tracking-tight text-lg">
                Black <span className="text-[color:var(--by-yellow)]">&amp;</span>{" "}
                Yellow
              </Link>
              <SiteNav />
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col">{children}</main>

        <footer className="border-t border-black/10 dark:border-white/10 text-xs text-black/60 dark:text-white/60">
          <div className="mx-auto max-w-6xl px-4 py-6 flex flex-wrap gap-x-6 gap-y-2 justify-between">
            <span>
              A non-profit community project. Report data is public and
              crowd-sourced.
            </span>
            <span className="flex gap-4">
              <Link href="/about">About</Link>
              <Link href="/guidelines">Guidelines</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
