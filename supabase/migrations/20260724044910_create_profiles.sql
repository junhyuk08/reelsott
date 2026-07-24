-- profiles table, populated automatically from auth.users signup metadata

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Runs as the table owner (security definer) so it can write into
-- public.profiles despite the inserting session being an anonymous signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, new.raw_user_meta_data ->> 'nickname');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
