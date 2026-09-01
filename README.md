# Black & Yellow

A community map of dangerous, unmarked speed breakers, with a discussion forum
and a moderator workflow. Built to run on **$0/year** hosting.

- **Map** — anyone can drop a pin + photos (no account). Submissions go to a
  moderation queue and only appear once approved.
- **Forum** — a global board (Announcements / Successes / General) plus an
  auto-created discussion thread per approved pin. Posting needs a (passwordless)
  account.
- **Moderation** — `/admin` for moderators: approve/reject reports, confirm
  "painted" photos, handle flags, remove posts. Admins can also manage roles.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript + Tailwind v4 |
| Hosting | Vercel Hobby (free) |
| DB / Auth / Storage | Supabase free tier (Postgres + PostGIS) |
| Map | MapLibre GL + OpenFreeMap vector tiles (no key) |
| Captcha | hCaptcha (free) |
| Keep-alive | GitHub Actions cron → `/api/health` |

## Local setup

1. **Create a Supabase project** (free tier).
2. In the Supabase **SQL editor**, run the three files in `supabase/migrations/`
   in order: `0001_init.sql`, `0002_rls.sql`, `0003_storage_seed.sql`.
   (Or use the CLI: `supabase link` then `supabase db push`.)
3. Copy env vars:
   ```bash
   cp .env.example .env.local
   ```
   Fill in from Supabase → Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only)
   Set `NEXT_PUBLIC_MAP_CENTER_LAT/LNG/ZOOM` to your launch city.
   hCaptcha vars can stay as the provided test keys locally (captcha is skipped
   when `HCAPTCHA_SECRET` is the all-zero test value).
4. Install & run:
   ```bash
   npm install
   npm run dev
   ```

## Auth configuration (Supabase dashboard)

- **Authentication → URL Configuration**: set Site URL to your deployed URL and
  add `http://localhost:3000/**` + `https://<your-app>.vercel.app/**` to the
  redirect allow-list.
- **Authentication → Email**: the default magic-link template works. For more
  than a few sign-ins per hour, add a free SMTP provider (e.g. Brevo, 300/day)
  under **Project Settings → Auth → SMTP**.

## Make yourself an admin

After signing in once, run this in the Supabase SQL editor:

```sql
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

## Deploy (Vercel)

1. Push this repo to GitHub.
2. Import into Vercel. Add all the env vars from `.env.local`, plus
   `NEXT_PUBLIC_SITE_URL=https://<your-app>.vercel.app` and a random
   `HEALTH_PING_SECRET`.
3. Deploy. Update the Supabase redirect allow-list with the real URL.

### Keep the database awake

Supabase free projects pause after ~7 days idle. Add a GitHub **repo secret**
`HEALTH_URL` = `https://<your-app>.vercel.app/api/health?secret=<HEALTH_PING_SECRET>`.
The workflow in `.github/workflows/keepalive.yml` pings it every 3 days.

## Free-tier limits to watch

- Supabase: 500 MB DB, 1 GB storage (~3000 compressed photos), 2 GB egress/mo.
- Photos are compressed client-side to ~0.3 MB and stripped of EXIF/GPS.
- OpenFreeMap has no SLA; to switch to MapTiler set `NEXT_PUBLIC_MAP_STYLE_URL`
  to a MapTiler style URL with your key.

## Project layout

```
app/                Next.js routes (map, submit, pin/[id], forum, admin, api)
components/          Client components (MapView, PinForm, ThreadView, …)
lib/                 Supabase clients, auth, captcha, rate limit, config
supabase/migrations/ SQL: schema, RLS, storage + seed
.github/workflows/   keep-alive cron
```
