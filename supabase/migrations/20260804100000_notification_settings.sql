-- Single on/off push preference, no per-category granularity per product
-- decision. Covered by the existing "Users can update their own profile"
-- policy + authenticated update grant (20260727010921) — not added to
-- protect_privileged_profile_columns' blocklist since, unlike coin_balance
-- etc., this is a value the user is meant to change directly.
alter table public.profiles
  add column if not exists push_enabled boolean not null default true;
