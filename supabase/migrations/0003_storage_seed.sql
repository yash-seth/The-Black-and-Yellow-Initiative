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
