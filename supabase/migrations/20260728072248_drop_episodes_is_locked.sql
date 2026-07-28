-- Locking is decided by dramas.free_episode_count (episode_number <=
-- free_episode_count is free) rather than a per-episode flag, so this
-- column would just be a second, driftable source of truth. No rows exist
-- yet in public.episodes, so there's no data to lose.
alter table public.episodes drop column if exists is_locked;
