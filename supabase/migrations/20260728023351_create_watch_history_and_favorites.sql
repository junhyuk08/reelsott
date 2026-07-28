-- One row per (user, drama): watched_at holds the most recent viewing time,
-- upserted on (user_id, drama_id) rather than logging every open as a new
-- row, since there's no episode-level granularity to distinguish repeats.
create table if not exists public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  drama_id uuid not null references public.dramas (id) on delete cascade,
  watched_at timestamptz not null default now(),
  unique (user_id, drama_id)
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  drama_id uuid not null references public.dramas (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, drama_id)
);

alter table public.watch_history enable row level security;
alter table public.favorites enable row level security;

create policy "Users can view their own watch history"
  on public.watch_history for select
  using (auth.uid() = user_id);

create policy "Users can insert their own watch history"
  on public.watch_history for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own watch history"
  on public.watch_history for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own watch history"
  on public.watch_history for delete
  using (auth.uid() = user_id);

create policy "Users can view their own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Users can insert their own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- RLS policies alone aren't enough without the base table GRANT (learned
-- the hard way with profiles/dramas earlier) — anon has no business here,
-- only logged-in users.
grant select, insert, update, delete on public.watch_history to authenticated;
grant select, insert, delete on public.favorites to authenticated;
