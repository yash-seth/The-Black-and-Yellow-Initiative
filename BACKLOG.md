# BACKLOG — Black & Yellow

Status of features against the plan. See `MEMORY.md` for decisions and
`README.md` for setup.

Legend: ✅ done · 🟡 partial · ⬜ not started

---

## Phase 1 — Map + submission + moderation (MVP)

- ✅ Project scaffold (Next.js 15 App Router, TS, Tailwind v4, ESLint)
- ✅ Supabase schema: `profiles`, `speed_breakers` (PostGIS), `photos`,
  `forum_categories/threads/posts`, `reports`, `rate_limits`
- ✅ RLS policies + `is_moderator/is_admin/is_active_user` helpers
- ✅ Storage bucket + policies + seed categories (`0003_storage_seed.sql`)
- ✅ Interactive map (`/`) — MapLibre + OpenFreeMap, native clustering,
  severity/paint colouring, popups, geolocate control
- ✅ Public pins feed via `public_speed_breakers()` GeoJSON RPC
- ✅ Anonymous submission (`/submit`): drag-pin location picker, "use my
  location", camera capture, up to 4 photos, client-side compression + EXIF
  strip, hCaptcha
- ✅ `POST /api/pins` — captcha verify + IP/token rate limiting + service-role
  insert as `pending`
- ✅ Pin detail page (`/pin/[id]`) — photos, meta, external map links, SEO metadata
- ✅ Moderation dashboard (`/admin`) — pending-pin queue with photo review,
  approve/reject (+reason)
- ✅ `/api/health` keep-alive endpoint + `.github/workflows/keepalive.yml`
- ✅ Verified: typecheck, production build, map renders in browser
- ⬜ Deploy to Vercel + create the real Supabase project (owner action — see `DEPLOY.md`)
- 🟡 Sample data — `supabase/seed_sample.sql` (8 Hyderabad pins + forum posts),
  validated against Postgres via PGlite. Real curated launch data still to do.

## Phase 2 — Auth + per-pin discussion

- ✅ Passwordless magic-link login (`/login`) + `/auth/callback`
  (handles both `code` PKCE and `token_hash` flows)
- ✅ `profiles` auto-created on signup (trigger); role/ban protected by trigger
- ✅ First-admin bootstrap path (SQL editor)
- ✅ Auto-created discussion thread when a pin is approved (trigger)
- ✅ `ThreadView` — comments with one level of replies, sign-in gating
- ✅ `ReportButton` on pins and posts → `POST /api/report`
- ✅ `SiteNav` shows auth state + Admin link for moderators
- 🟡 Post editing — RLS allows author edit within 15 min + `protect_post`
  trigger, but there is **no edit UI yet**
- ⬜ Google OAuth option (deferred; email-only for now)
- ⬜ Configure Brevo (or similar) SMTP for magic-link volume beyond ~3–4/hr

## Phase 3 — Global forum + success loop

- ✅ Global board with categories (`/forum`, `/forum/[category]`)
- ✅ New-thread form (`NewThreadForm`) — members start threads in categories
- ✅ Thread page (`/forum/thread/[id]`), links pin threads back to the map
- ✅ "After" photo upload (`AfterPhotoUpload`) → `POST /api/after-photos`
- ✅ Moderator "confirm painted" → trigger sets `paint_state='marked'`,
  `verified_by/at`, and auto-posts to **Successes**
- ✅ Admin: painted-confirmation queue, open-reports list, recent forum posts
  (remove/restore), lock thread
- ✅ Admin (admins only): user list, set role, ban/unban
- 🟡 Thread moderation — lock/remove works via server actions; "removed"
  threads 404. No unlock button in the UI (only lock).
- ⬜ Notifications when a followed pin/thread updates
- ⬜ "Follow this speed breaker" / watchlist

## Phase 4 — Hardening

- 🟡 PWA — `manifest.ts` + `icon.svg` present; **no service worker / offline shell**
- ✅ `robots.ts` (disallows `/admin`, `/api/`)
- ⬜ `sitemap.xml` (referenced by robots.ts but not generated)
- ⬜ Rate-limit tuning + abuse dashboard; per-user (not just per-IP) limits on
  authenticated actions
- ⬜ Report-resolution workflow beyond a "Resolve" button (link to the
  offending content, bulk actions)
- ⬜ Analytics (Vercel free / Plausible)
- ✅ Content: `/about`, `/guidelines` pages
- ✅ README screenshots (`docs/screenshots/`) + shields.io badges
- ⬜ OG image for social sharing
- ⬜ Accessibility pass (keyboard nav on map, ARIA on custom controls)
- ⬜ Error boundaries + nicer empty/error states
- ⬜ Basic tests (RLS policy tests, API route tests)

## Known limitations / tech debt

- `window.__map` dev hook in `MapView.tsx` (guarded by `NODE_ENV`, harmless).
- No image thumbnails — full compressed JPEGs are served everywhere.
- `reports` table is not cleaned up; resolved reports accumulate.
- No dedupe of near-identical pins (two people reporting the same speed breaker);
  moderators handle it manually.
- Forum has no pagination — fine at low volume, revisit if threads grow.
- Map fetches *all* approved pins at once (fine for one city; add viewport
  bbox filtering before expanding).
- `next.config.ts` image `remotePatterns` falls back to `*.supabase.co` when
  the env URL is absent at build.
