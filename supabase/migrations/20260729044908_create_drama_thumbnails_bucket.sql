-- Same shape as episode-videos: `public = true` lets GET/playback bypass
-- RLS entirely via the public object URL, so only writes need policies.
insert into storage.buckets (id, name, public)
values ('drama-thumbnails', 'drama-thumbnails', true)
on conflict (id) do nothing;

create policy "Admins can view drama thumbnail objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'drama-thumbnails'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can upload drama thumbnails"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'drama-thumbnails'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can update drama thumbnails"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'drama-thumbnails'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    bucket_id = 'drama-thumbnails'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can delete drama thumbnails"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'drama-thumbnails'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
