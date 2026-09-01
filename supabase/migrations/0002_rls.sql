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
