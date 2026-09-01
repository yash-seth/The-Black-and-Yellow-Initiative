# MEMORY — Black & Yellow

Key facts and decisions. Update this as the project evolves.

## What it is

A non-profit community website for mapping dangerous, **unmarked** speed breakers
so that local authorities paint them in the regulation black-and-yellow pattern.
Run at cost by the owner for social good.

Three parts:
1. **Map** — anyone drops a pin + photos at the exact location of a hazardous
   speed breaker.
2. **Forum** — discussion attached to each speed breaker, plus a global board;
   used to coordinate follow-up and celebrate fixes.
3. **Moderation** — volunteer moderators verify submissions and forum content;
   admins manage roles.

## Product decisions (locked 2026-09-02)

| Decision | Choice | Why |
|---|---|---|
| Map submissions | **Anonymous allowed**, no login | Lowest friction to report |
| Submission visibility | Hidden until a **moderator approves** | Anonymous ⇒ abuse risk; keep the public map clean |
| Forum posting | **Requires login** (passwordless magic-link) | Accountability for discussion |
| Geographic scope | **One city/region at launch — piloting in Hyderabad** | Keeps free-tier usage low; easier to moderate. Map center is set via `NEXT_PUBLIC_MAP_CENTER_*` (defaults to Hyderabad, 17.3850 / 78.4867) |
| Budget | **$0/year** | Personal funding. `*.vercel.app` subdomain, all free tiers |
| Forum structure | **Per-pin auto threads + global board** (Announcements / Successes / General) | Space for both specific follow-up and general community talk |
| Paint verification | User uploads "after" photos → moderator confirms → pin turns green + auto-post in Successes | Closes the loop, motivates |

## Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | |
| Styling | Tailwind CSS v4 | hazard-stripe accent, black `#1a1a1a` / yellow `#f5c518` |
| Hosting | Vercel Hobby (free) | |
| DB / Auth / Storage | Supabase free tier | Postgres + **PostGIS**, magic-link auth, 1 GB storage bucket |
| Map rendering | MapLibre GL JS | native GeoJSON clustering (no supercluster dep) |
| Map tiles | **OpenFreeMap** (`tiles.openfreemap.org/styles/liberty`) | no API key, no usage cap; MapTiler fallback via `NEXT_PUBLIC_MAP_STYLE_URL` |
| Captcha | hCaptcha (free) | skipped locally when `HCAPTCHA_SECRET` is the all-zero test value |
| Email (magic links) | Supabase default SMTP; swap to Brevo free SMTP (300/day) for volume | |
| Keep-alive | GitHub Actions cron → `/api/health` every 3 days | free Supabase project pauses after ~7 days idle |

## Architecture facts

- **Anonymous writes never touch the DB directly.** `/api/pins`, `/api/report`,
  `/api/after-photos` run captcha + rate-limit checks, then write with the
  **service-role key**. RLS has *no* anon INSERT policy by design.
- Photos are compressed client-side to ~0.3 MB and re-encoded to JPEG, which
  **strips EXIF/GPS**. Server also enforces type + 1.2 MB cap. Public bucket,
  1 MB hard limit set on the bucket itself.
- **RLS roles** via SECURITY DEFINER helpers `is_moderator()` / `is_admin()` /
  `is_active_user()` (avoid policy recursion). `profiles.role` can only be
  changed by an admin — enforced by the `protect_profile` trigger, which lets
  `auth.uid() IS NULL` (SQL editor / service role) through so the **first admin
  can be bootstrapped** with `update profiles set role='admin' where ...`.
- DB triggers do the automation: pin approved → its forum thread is created;
  "after" photo approved (and pin not already marked) → `paint_state='marked'`
  + a Successes thread/post; any post → thread `last_post_at` bumped.
- Rate limiting = `rate_limits` table + `check_rate_limit()` SQL function
  (fixed window, minute buckets). Limits in `lib/config.ts`:
  5 pins/hr and 15 pins/day per IP, 5 pins/hr per anon token, 10 reports/hr.
- `middleware.ts` refreshes the Supabase session cookie on every request.
- Map height is set explicitly from `window.innerHeight` in JS (a `100dvh` CSS
  approach rendered 0-height in some embedded browsers).

## Rate limits / free-tier ceilings to watch

- Supabase free: 500 MB DB, **1 GB storage (~3000 compressed photos)**,
  2 GB egress/mo, project pauses at 7 days idle.
- OpenFreeMap has no SLA (donation-funded).
- Brevo free SMTP: 300 emails/day.

## Environment variables

See `.env.example`. Required for anything to work:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (server only). Map center:
`NEXT_PUBLIC_MAP_CENTER_LAT/LNG`, `NEXT_PUBLIC_MAP_DEFAULT_ZOOM`.
Deploy also needs `NEXT_PUBLIC_SITE_URL` and a random `HEALTH_PING_SECRET`;
GitHub repo needs a `HEALTH_URL` secret for the keep-alive workflow.

## Key paths

- Plan: `C:\Users\yashs\.claude\plans\i-intend-to-build-snuggly-blanket.md`
- SQL: `supabase/migrations/0001_init.sql` → `0002_rls.sql` → `0003_storage_seed.sql` (run in order)
- Config / limits: `lib/config.ts`
- Setup + deploy steps: `README.md`
- Status: `BACKLOG.md`
