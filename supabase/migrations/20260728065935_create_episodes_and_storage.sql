create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  drama_id uuid not null references public.dramas (id) on delete cascade,
  episode_number integer not null,
  video_url text,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (drama_id, episode_number)
);

alter table public.episodes enable row level security;

create policy "Episodes are viewable by everyone"
  on public.episodes for select
  using (true);

create policy "Admins can insert episodes"
  on public.episodes for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can update episodes"
  on public.episodes for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can delete episodes"
  on public.episodes for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

grant select on public.episodes to anon, authenticated;
grant insert, update, delete on public.episodes to authenticated;

-- `public = true` makes Storage serve objects in this bucket over the
-- public URL without any auth/RLS check, so video playback works with no
-- SELECT policy needed on storage.objects. Writes still go through RLS,
-- so only admins can upload/replace/remove files.
insert into storage.buckets (id, name, public)
values ('episode-videos', 'episode-videos', true)
on conflict (id) do nothing;

-- Public GET (playback) bypasses RLS entirely via the public object URL, so
-- this policy isn't needed for that. It's needed anyway for authenticated
-- admin management calls (update/delete): Storage resolves the target row
-- through the caller's RLS-scoped SELECT first, so without this, an admin's
-- update/delete requests can't even locate the object and get rejected.
create policy "Admins can view episode video objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'episode-videos'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can upload episode videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'episode-videos'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can update episode videos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'episode-videos'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    bucket_id = 'episode-videos'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can delete episode videos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'episode-videos'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
