-- RLS policies only take effect once the role also holds the base table
-- privilege. The earlier migration added policies but never granted the
-- underlying SELECT/UPDATE to anon/authenticated, so every read of
-- public.profiles was rejected with "permission denied for table profiles".
grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;
