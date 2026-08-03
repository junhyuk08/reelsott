-- Mirrors get_email_by_nickname (20260724051058): same SECURITY DEFINER +
-- anon/authenticated execute shape, so signup can pre-check nickname
-- availability the same way login resolves nickname -> email. Lets the
-- client show a Korean error before hitting the unique index
-- (profiles_nickname_lower_idx) during signUp.
create or replace function public.check_nickname_available(p_nickname text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where lower(nickname) = lower(p_nickname)
  );
$$;

revoke all on function public.check_nickname_available(text) from public;
grant execute on function public.check_nickname_available(text) to anon, authenticated;
