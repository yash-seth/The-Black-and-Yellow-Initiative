# Deploy runbook

One-time setup to get Black & Yellow live on free tiers. ~20 minutes.
You need: a GitHub account (repo already pushed), and you'll create free
Supabase + Vercel accounts.

---

## 1. Supabase project

1. Go to <https://supabase.com/dashboard> → **New project**.
   - Name: `black-and-yellow`
   - Database password: generate a strong one, **save it** (you rarely need it,
     but there's no recovery).
   - Region: **South Asia (Mumbai)** — closest to Hyderabad.
   - Plan: Free.
2. Wait ~2 min for it to provision.
3. **SQL editor** → New query → paste the entire contents of
   [`supabase/all_migrations.sql`](supabase/all_migrations.sql) → **Run**.
   Expect "Success. No rows returned".
4. _(optional, recommended for first test)_ New query → paste
   [`supabase/seed_sample.sql`](supabase/seed_sample.sql) → **Run**. Adds 8
   Hyderabad pins + a few forum posts.
5. **Project Settings → API** — copy these three, you'll need them in step 3:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY` (keep private)
6. **Authentication → URL Configuration**:
   - Site URL: leave as is for now; you'll set it to the Vercel URL in step 4.
   - Redirect URLs → add `http://localhost:3000/**`
7. Storage bucket `speed-breaker-photos` was created by the SQL — nothing to do.

## 2. Generate a health-ping secret

Run locally (any value works, just make it long and random):

```bash
openssl rand -base64 24
```

Call the output `HEALTH_PING_SECRET`. You'll use it in steps 3 and 5.

## 3. Vercel project

1. Go to <https://vercel.com/new> → sign in with GitHub → **Import**
   `yash-seth/The-Black-and-Yellow-Initiative`.
2. Framework preset: Next.js (auto-detected). Leave build settings default.
3. **Environment Variables** — add all of these (Production + Preview):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from Supabase step 1.5 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase step 1.5 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Supabase step 1.5 |
   | `NEXT_PUBLIC_MAP_CENTER_LAT` | `17.3850` |
   | `NEXT_PUBLIC_MAP_CENTER_LNG` | `78.4867` |
   | `NEXT_PUBLIC_MAP_DEFAULT_ZOOM` | `12` |
   | `NEXT_PUBLIC_MAP_STYLE_URL` | `https://tiles.openfreemap.org/styles/liberty` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-app>.vercel.app` (guess it now, fix after first deploy) |
   | `HEALTH_PING_SECRET` | from step 2 |
   | `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | `10000000-ffff-ffff-ffff-000000000001` (test key; replace later — step 6) |
   | `HCAPTCHA_SECRET` | `0x0000000000000000000000000000000000000000` (test key; replace later) |

4. **Deploy**. Note the real URL it gives you.

## 4. Wire the URLs together

1. Vercel → Settings → Environment Variables → set `NEXT_PUBLIC_SITE_URL` to the
   real `https://<your-app>.vercel.app`, then **Redeploy**.
2. Supabase → Authentication → URL Configuration:
   - Site URL = `https://<your-app>.vercel.app`
   - Redirect URLs → add `https://<your-app>.vercel.app/**`

## 5. Keep the database awake

Supabase free projects pause after ~7 days idle. The repo already has
`.github/workflows/keepalive.yml`.

1. GitHub repo → Settings → Secrets and variables → Actions → **New repository
   secret**:
   - Name: `HEALTH_URL`
   - Value: `https://<your-app>.vercel.app/api/health?secret=<HEALTH_PING_SECRET>`
2. Actions tab → "keep-alive" → **Run workflow** once to confirm it returns 200.

## 6. Make yourself an admin

1. Open the site, click **Sign in**, enter your email, click the magic link.
2. Supabase → SQL editor:
   ```sql
   update profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
3. Reload the site — an **Admin** link appears in the nav.

## 7. Replace the test captcha (before sharing publicly)

1. <https://dashboard.hcaptcha.com> → add a site → get the **site key** and
   **secret**.
2. Vercel env vars: set `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` and `HCAPTCHA_SECRET` to
   the real values → Redeploy.

## 8. Email deliverability (when sign-ups pick up)

Supabase's built-in email is limited to a few per hour. When you outgrow it:
Supabase → Project Settings → Auth → SMTP → plug in a free provider
(e.g. Brevo, 300/day, sends from their domain).

---

## Smoke test after deploy

- `/` loads the Hyderabad map (with sample pins if you ran the seed).
- `/submit` — place a pin, add a photo, submit → "waiting for review".
- `/admin` (as admin) — the pin is in the queue → Approve → it appears on `/`.
- `/forum` — post a comment while signed in.
- Sign out → `/admin` shows "Not authorised".
