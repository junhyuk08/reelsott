-- 이어보기 기능용 — 드라마별로 마지막으로 본 회차를 기록한다. episode가 삭제돼도
-- watch_history 행 자체(시청 이력)는 남아야 하므로 cascade delete가 아니라
-- set null로 참조를 끊는다.
alter table public.watch_history
  add column if not exists last_episode_id uuid
    references public.episodes (id) on delete set null;

-- RLS/그랜트는 새로 추가할 필요 없음 — watch_history는 이미 select/insert/update/delete
-- 정책과 grant가 본인 행(auth.uid() = user_id) 기준으로 걸려 있고(20260728023351),
-- RLS는 컬럼 단위가 아니라 행 단위라 새 컬럼에도 그대로 적용된다.
