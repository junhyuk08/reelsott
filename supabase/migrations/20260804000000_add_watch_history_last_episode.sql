-- Tracks the episode a user was last watching per drama, so "이어서 보기"
-- (continue watching) can resume playback at that episode instead of just
-- reopening the drama's synopsis screen. Nullable: rows written before this
-- column existed, or writes from screens that only know the drama (not a
-- specific episode), leave it unset.
alter table public.watch_history
  add column if not exists last_episode_id uuid references public.episodes (id) on delete set null;
