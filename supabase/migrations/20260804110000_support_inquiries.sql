-- Customer support inbox. Mirrors favorites/watch_history's RLS shape: own
-- rows only, insert-your-own, no update/delete grant (status changes are an
-- admin-side concern not built yet — no UI touches it, so nothing to break).
create table if not exists public.support_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content text not null,
  status text not null default 'pending' check (status in ('pending', 'answered', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.support_inquiries enable row level security;

create policy "Users can view their own inquiries"
  on public.support_inquiries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own inquiries"
  on public.support_inquiries for insert
  with check (auth.uid() = user_id);

grant select, insert on public.support_inquiries to authenticated;
