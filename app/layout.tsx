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
        <header className="by-header">
          <div className="mx-auto max-w-6xl px-4 min-h-14 py-2 flex items-center justify-between gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-extrabold tracking-tight shrink-0"
            >
              <span aria-hidden className="by-mark">
                B
              </span>
              <span className="hidden min-[420px]:inline text-sm sm:text-[15px] uppercase tracking-[0.04em] leading-none whitespace-nowrap">
                Black{" "}
                <span className="text-[color:var(--by-yellow)]">&amp;</span>{" "}
                Yellow
              </span>
            </Link>
            <SiteNav />
          </div>
          <div className="hazard-stripe h-1" aria-hidden />
        </header>

        <main className="flex-1 flex flex-col">{children}</main>

        <footer className="by-footer text-xs">
          <div className="mx-auto max-w-6xl px-4 py-6 flex flex-wrap gap-x-6 gap-y-2 justify-between">
            <span>
              A non-profit community project. Report data is public and
              crowd-sourced.
            </span>
            <span className="flex gap-4">
              <Link href="/about" className="by-link">
                About
              </Link>
              <Link href="/guidelines" className="by-link">
                Guidelines
              </Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
