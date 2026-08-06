-- These tables previously granted select only to `authenticated`, so an
-- unauthenticated request (missing/invalid Authorization header, running as
-- `anon`) failed at the GRANT check before RLS even ran — PostgREST returns
-- that as a raw Postgres error, e.g.
--   {"code":"42501","message":"permission denied for table watch_history",
--    "hint":"Grant the required privileges to the current role with: ..."}
-- which leaks internal schema/grant details to anyone probing the API.
--
-- Granting `anon` select too and relying on the existing RLS policies
-- (all scoped to `auth.uid() = user_id`, or admin-only for
-- admin_action_logs) removes the leak entirely rather than just prettifying
-- it: auth.uid() is null for anon, so these policies match zero rows and
-- the response becomes a clean 200 with `[]` instead of an error at all.
-- Write access (insert/update/delete) is intentionally left authenticated-
-- only — anon has no business writing here regardless of RLS.
grant select on public.watch_history to anon;
grant select on public.favorites to anon;
grant select on public.attendance_logs to anon;
grant select on public.unlocked_episodes to anon;
grant select on public.support_inquiries to anon;
grant select on public.admin_action_logs to anon;
grant select on public.coin_transactions to anon;
