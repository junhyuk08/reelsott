-- Nicknames must be unique (case-insensitive) for nickname-based login to
-- resolve to exactly one account.
create unique index if not exists profiles_nickname_lower_idx
  on public.profiles (lower(nickname));

-- Resolves a nickname to its account email so the client can sign in via
-- Supabase Auth's email/password flow. SECURITY DEFINER so an anonymous
-- caller can look this up without being granted direct SELECT on auth.users.
create or replace function public.get_email_by_nickname(p_nickname text)
returns text
language sql
security definer
set search_path = public, auth
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.nickname) = lower(p_nickname)
  limit 1;
$$;

revoke all on function public.get_email_by_nickname(text) from public;
grant execute on function public.get_email_by_nickname(text) to anon, authenticated;
