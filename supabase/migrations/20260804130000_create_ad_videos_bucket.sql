-- Self-hosted stand-in for AdMob rewarded ads (see reward logic notes in the
-- handoff memo). Same shape as episode-videos (20260728065935): `public =
-- true` lets GET/playback bypass RLS entirely via the public object URL, so
-- only writes need policies. file_size_limit is set upfront at 100MB (ad
-- clips are short, unlike full episodes) rather than needing a follow-up
-- bump migration like episode-videos did.
insert into storage.buckets (id, name, public, file_size_limit)
values ('ad-videos', 'ad-videos', true, 100 * 1024 * 1024)
on conflict (id) do nothing;

create policy "Admins can view ad video objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'ad-videos'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can upload ad videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ad-videos'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can update ad videos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'ad-videos'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    bucket_id = 'ad-videos'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can delete ad videos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'ad-videos'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
