-- Free-episode cutoff is derived from episode_count (25%, minimum 3) so it
-- always matches the rule and never drifts if episode_count is edited later.
alter table public.dramas
  add column if not exists free_episode_count integer
  generated always as (greatest(3, round(episode_count * 0.25)::int)) stored;
