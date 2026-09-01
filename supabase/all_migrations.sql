-- Black & Yellow — full database setup.
-- Paste this whole file into the Supabase SQL editor and Run (once).
-- It is migrations 0001 + 0002 + 0003 concatenated. Safe to re-run.

-- ==================== 0001_init.sql ====================
-- Black & Yellow — core schema, functions, triggers.
-- Run with: supabase db push   (or paste into the Supabase SQL editor)

create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type role as enum ('user', 'moderator', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pin_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type paint_state as enum ('unmarked', 'marked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type severity as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type photo_kind as enum ('report', 'after');
exception when duplicate_object then null; end $$;

do $$ begin
  create type photo_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum ('visible', 'pending', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type thread_status as enum ('open', 'locked', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_target as enum ('speed_breaker', 'forum_post');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  role          role not null default 'user',
  is_banned     boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists speed_breakers (
  id             uuid primary key default gen_random_uuid(),
  lat            double precision not null check (lat between -90 and 90),
  lng            double precision not null check (lng between -180 and 180),
  geog           geography(Point, 4326),
  description    text check (char_length(description) <= 2000),
  landmark       text check (char_length(landmark) <= 200),
  severity       severity not null default 'medium',
  status         pin_status not null default 'pending',
  paint_state    paint_state not null default 'unmarked',
  submitter_id   uuid references auth.users (id) on delete set null,
  submitter_token text,
  reject_reason  text,
  verified_by    uuid references auth.users (id) on delete set null,
  verified_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists speed_breakers_status_idx on speed_breakers (status);
create index if not exists speed_breakers_geog_idx on speed_breakers using gist (geog);

create table if not exists photos (
  id               uuid primary key default gen_random_uuid(),
  speed_breaker_id uuid not null references speed_breakers (id) on delete cascade,
  storage_path     text not null,
  kind             photo_kind not null default 'report',
  status           photo_status not null default 'pending',
  uploader_id      uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists photos_sb_idx on photos (speed_breaker_id);

create table if not exists forum_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort        int not null default 0
);

create table if not exists forum_threads (
  id               uuid primary key default gen_random_uuid(),
  category_id      uuid references forum_categories (id) on delete set null,
  speed_breaker_id uuid unique references speed_breakers (id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 200),
  author_id        uuid references profiles (id) on delete set null,
  status           thread_status not null default 'open',
  created_at       timestamptz not null default now(),
  last_post_at     timestamptz not null default now(),
  constraint thread_target_ck check (num_nonnulls(category_id, speed_breaker_id) >= 1)
);
create index if not exists forum_threads_category_idx on forum_threads (category_id, last_post_at desc);

create table if not exists forum_posts (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references forum_threads (id) on delete cascade,
  parent_id  uuid references forum_posts (id) on delete set null,
  author_id  uuid references profiles (id) on delete set null,
  body       text not null check (char_length(body) between 1 and 5000),
  status     post_status not null default 'visible',
  created_at timestamptz not null default now()
);
create index if not exists forum_posts_thread_idx on forum_posts (thread_id, created_at);

create table if not exists reports (
  id          uuid primary key default gen_random_uuid(),
  target_type report_target not null,
  target_id   uuid not null,
  reason      text not null check (char_length(reason) between 1 and 1000),
  reporter_id uuid references auth.users (id) on delete set null,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists reports_open_idx on reports (resolved, created_at desc);

create table if not exists rate_limits (
  key          text not null,
  action       text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (key, action, window_start)
);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so RLS policies can call them without
-- recursing back into the policies being evaluated)
-- ---------------------------------------------------------------------------
create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('moderator', 'admin') and not is_banned
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and not is_banned
  );
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and not is_banned);
$$;

-- Public map data as a GeoJSON FeatureCollection (approved pins only).
create or replace function public.public_speed_breakers()
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'geometry', jsonb_build_object(
          'type', 'Point',
          'coordinates', jsonb_build_array(lng, lat)
        ),
        'properties', jsonb_build_object(
          'id', id,
          'severity', severity,
          'paint_state', paint_state
        )
      )
    ), '[]'::jsonb)
  )
  from speed_breakers
  where status = 'approved';
$$;

-- Fixed-window rate limiter. Only called by trusted server code (service role).
create or replace function public.check_rate_limit(
  p_key text, p_action text, p_limit int, p_window_seconds int
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_since timestamptz := now() - make_interval(secs => p_window_seconds);
  v_count int;
begin
  delete from rate_limits where window_start < now() - interval '2 days';

  select coalesce(sum(count), 0) into v_count
  from rate_limits
  where key = p_key and action = p_action and window_start >= v_since;

  if v_count >= p_limit then
    return false;
  end if;

  insert into rate_limits (key, action, window_start, count)
  values (p_key, p_action, date_trunc('minute', now()), 1)
  on conflict (key, action, window_start)
  do update set count = rate_limits.count + 1;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- New auth user -> profile row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(coalesce(new.email, 'neighbour'), '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep geog in sync with lat/lng.
create or replace function public.speed_breaker_geog()
returns trigger language plpgsql as $$
begin
  new.geog := ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326)::geography;
  return new;
end;
$$;
drop trigger if exists speed_breaker_geog_t on speed_breakers;
create trigger speed_breaker_geog_t
  before insert or update of lat, lng on speed_breakers
  for each row execute function public.speed_breaker_geog();

-- Non-admins may not change their own role / ban status.
create or replace function public.protect_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for the service role / SQL editor, which is how the very
  -- first admin is bootstrapped; those edits are allowed through.
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.is_banned := old.is_banned;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_t on profiles;
create trigger protect_profile_t
  before update on profiles
  for each row execute function public.protect_profile();

-- Pin approved -> create its discussion thread.
create or replace function public.on_speed_breaker_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    insert into forum_threads (speed_breaker_id, title, author_id)
    values (new.id, coalesce(nullif(new.landmark, ''), 'Speed breaker report'), auth.uid())
    on conflict (speed_breaker_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists on_speed_breaker_status_t on speed_breakers;
create trigger on_speed_breaker_status_t
  after update of status on speed_breakers
  for each row execute function public.on_speed_breaker_status();

-- "After" photo approved -> mark the pin painted + celebrate in Successes.
create or replace function public.on_photo_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_prev paint_state;
  v_landmark text;
  v_cat uuid;
  v_thread uuid;
begin
  if new.kind = 'after' and new.status = 'approved'
     and old.status is distinct from 'approved' then

    select paint_state, coalesce(nullif(landmark, ''), 'a speed breaker')
      into v_prev, v_landmark
      from speed_breakers where id = new.speed_breaker_id;

    if v_prev is distinct from 'marked' then
      update speed_breakers
        set paint_state = 'marked', verified_by = auth.uid(), verified_at = now()
        where id = new.speed_breaker_id;

      select id into v_cat from forum_categories where slug = 'successes';
      if v_cat is not null then
        insert into forum_threads (category_id, title, author_id)
        values (v_cat, 'Painted: ' || v_landmark, auth.uid())
        returning id into v_thread;

        insert into forum_posts (thread_id, author_id, body)
        values (
          v_thread, auth.uid(),
          'This speed breaker has now been painted in black and yellow. '
          || 'Location: /pin/' || new.speed_breaker_id
        );
      end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists on_photo_status_t on photos;
create trigger on_photo_status_t
  after update of status on photos
  for each row execute function public.on_photo_status();

-- Bump thread activity timestamp on new post.
create or replace function public.bump_thread()
returns trigger language plpgsql as $$
begin
  update forum_threads set last_post_at = now() where id = new.thread_id;
  return new;
end;
$$;
drop trigger if exists bump_thread_t on forum_posts;
create trigger bump_thread_t
  after insert on forum_posts
  for each row execute function public.bump_thread();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function public.is_moderator() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_active_user() to anon, authenticated;
grant execute on function public.public_speed_breakers() to anon, authenticated;
grant execute on function public.check_rate_limit(text, text, int, int) to service_role;

-- ==================== 0002_rls.sql ====================
-- Black & Yellow — Row Level Security.
-- Anonymous map submissions and reports are inserted by server routes using the
-- service-role key (which bypasses RLS) after captcha + rate-limit checks, so
-- there is deliberately no anon INSERT policy on those tables.

alter table profiles         enable row level security;
alter table speed_breakers   enable row level security;
alter table photos           enable row level security;
alter table forum_categories enable row level security;
alter table forum_threads    enable row level security;
alter table forum_posts      enable row level security;
alter table reports          enable row level security;
alter table rate_limits      enable row level security;  -- no policies => service role only

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles
  for select using (true);

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_admin_all on profiles;
create policy profiles_admin_all on profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- speed_breakers
-- ---------------------------------------------------------------------------
drop policy if exists sb_select_public on speed_breakers;
create policy sb_select_public on speed_breakers
  for select using (
    status = 'approved'
    or public.is_moderator()
    or submitter_id = auth.uid()
  );

drop policy if exists sb_mod_write on speed_breakers;
create policy sb_mod_write on speed_breakers
  for update using (public.is_moderator()) with check (public.is_moderator());

drop policy if exists sb_admin_delete on speed_breakers;
create policy sb_admin_delete on speed_breakers
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- photos
-- ---------------------------------------------------------------------------
drop policy if exists photos_select on photos;
create policy photos_select on photos
  for select using (
    public.is_moderator()
    or uploader_id = auth.uid()
    or (
      status = 'approved'
      and exists (
        select 1 from speed_breakers sb
        where sb.id = photos.speed_breaker_id and sb.status = 'approved'
      )
    )
  );

drop policy if exists photos_mod_write on photos;
create policy photos_mod_write on photos
  for update using (public.is_moderator()) with check (public.is_moderator());

drop policy if exists photos_admin_delete on photos;
create policy photos_admin_delete on photos
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- forum_categories
-- ---------------------------------------------------------------------------
drop policy if exists cat_select on forum_categories;
create policy cat_select on forum_categories for select using (true);

drop policy if exists cat_admin on forum_categories;
create policy cat_admin on forum_categories
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- forum_threads
-- ---------------------------------------------------------------------------
drop policy if exists thread_select on forum_threads;
create policy thread_select on forum_threads
  for select using (status <> 'removed' or public.is_moderator());

-- Members may start threads only inside a category (pin threads are auto-made).
drop policy if exists thread_insert on forum_threads;
create policy thread_insert on forum_threads
  for insert with check (
    public.is_active_user()
    and author_id = auth.uid()
    and category_id is not null
    and speed_breaker_id is null
    and status = 'open'
  );

drop policy if exists thread_mod_write on forum_threads;
create policy thread_mod_write on forum_threads
  for update using (public.is_moderator()) with check (public.is_moderator());

drop policy if exists thread_admin_delete on forum_threads;
create policy thread_admin_delete on forum_threads
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- forum_posts
-- ---------------------------------------------------------------------------
drop policy if exists post_select on forum_posts;
create policy post_select on forum_posts
  for select using (
    status = 'visible' or public.is_moderator() or author_id = auth.uid()
  );

drop policy if exists post_insert on forum_posts;
create policy post_insert on forum_posts
  for insert with check (
    public.is_active_user()
    and author_id = auth.uid()
    and status = 'visible'
    and exists (
      select 1 from forum_threads t
      where t.id = thread_id and t.status = 'open'
    )
  );

-- Authors may edit their own post body for 15 minutes (column protection via
-- trigger below); moderators may always edit.
drop policy if exists post_update on forum_posts;
create policy post_update on forum_posts
  for update using (
    public.is_moderator()
    or (author_id = auth.uid() and created_at > now() - interval '15 minutes')
  ) with check (
    public.is_moderator()
    or (author_id = auth.uid() and status = 'visible')
  );

drop policy if exists post_admin_delete on forum_posts;
create policy post_admin_delete on forum_posts
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
drop policy if exists report_insert_auth on reports;
create policy report_insert_auth on reports
  for insert with check (public.is_active_user() and reporter_id = auth.uid());

drop policy if exists report_mod_read on reports;
create policy report_mod_read on reports
  for select using (public.is_moderator());

drop policy if exists report_mod_write on reports;
create policy report_mod_write on reports
  for update using (public.is_moderator()) with check (public.is_moderator());

-- ---------------------------------------------------------------------------
-- forum_posts: prevent authors from moving a post between threads / changing
-- authorship during their edit window.
-- ---------------------------------------------------------------------------
create or replace function public.protect_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then
    new.thread_id := old.thread_id;
    new.parent_id := old.parent_id;
    new.author_id := old.author_id;
    new.created_at := old.created_at;
    new.status := old.status;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_post_t on forum_posts;
create trigger protect_post_t
  before update on forum_posts
  for each row execute function public.protect_post();

-- ==================== 0003_storage_seed.sql ====================
-- Black & Yellow — storage bucket, storage policies, seed data.

-- Public bucket for speed-breaker photos. Uploads happen through server routes
-- with the service-role key; the public only ever reads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'speed-breaker-photos', 'speed-breaker-photos', true,
  1048576, array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sb photos public read" on storage.objects;
create policy "sb photos public read" on storage.objects
  for select using (bucket_id = 'speed-breaker-photos');

drop policy if exists "sb photos mod delete" on storage.objects;
create policy "sb photos mod delete" on storage.objects
  for delete using (
    bucket_id = 'speed-breaker-photos' and public.is_moderator()
  );

-- Seed forum categories.
insert into forum_categories (slug, name, description, sort) values
  ('announcements', 'Announcements', 'Updates from the moderator team.', 1),
  ('successes', 'Successes', 'Speed breakers that have been painted black & yellow.', 2),
  ('general', 'General', 'Road-safety discussion and everything else.', 3)
on conflict (slug) do nothing;
