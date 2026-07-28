-- Documents the episodes table for the repo — it was already created directly
-- on the live project (columns confirmed via the REST API: id, drama_id,
-- episode_number, video_url, is_locked), so this uses `if not exists`
-- throughout and is a no-op there; it exists so a fresh local/staging
-- Supabase instance ends up with the same schema.
create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  drama_id uuid not null references public.dramas (id) on delete cascade,
  episode_number integer not null,
  video_url text not null,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (drama_id, episode_number)
);

alter table public.episodes enable row level security;

create policy "Episodes are viewable by everyone"
  on public.episodes for select
  using (true);

grant select on public.episodes to anon, authenticated;
