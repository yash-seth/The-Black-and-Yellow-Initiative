/** Runtime configuration derived from environment variables. */

function num(value: string | undefined, fallback: number): number {
  const n = value ? Number(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export const map = {
  center: [
    num(process.env.NEXT_PUBLIC_MAP_CENTER_LNG, 77.5946),
    num(process.env.NEXT_PUBLIC_MAP_CENTER_LAT, 12.9716),
  ] as [number, number],
  defaultZoom: num(process.env.NEXT_PUBLIC_MAP_DEFAULT_ZOOM, 12),
  styleUrl:
    process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
    "https://tiles.openfreemap.org/styles/liberty",
};

export const hcaptcha = {
  siteKey:
    process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ??
    "10000000-ffff-ffff-ffff-000000000001",
  /** When false, captcha verification is skipped (local dev without keys). */
  enabled: Boolean(
    process.env.HCAPTCHA_SECRET &&
      process.env.HCAPTCHA_SECRET !==
        "0x0000000000000000000000000000000000000000",
  ),
};

export const PHOTOS_BUCKET = "speed-breaker-photos";

/** Anon submission limits (enforced in the DB via the rate_limits table). */
export const rateLimits = {
  pinsPerHour: 5,
  pinsPerDay: 15,
  reportsPerHour: 10,
};
