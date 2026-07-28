create table if not exists public.dramas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  thumbnail_url text,
  genre text not null,
  episode_count integer not null default 0,
  is_new boolean not null default false,
  view_count bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.dramas enable row level security;

create policy "Dramas are viewable by everyone"
  on public.dramas for select
  using (true);

-- RLS policies alone aren't enough — the base table GRANT has to exist too,
-- or anon/authenticated get "permission denied" regardless of policy.
grant select on public.dramas to anon, authenticated;

insert into public.dramas (title, thumbnail_url, genre, episode_count, is_new, view_count) values
  ('재벌집 아르바이트생', 'https://placehold.co/300x420?text=%EC%9E%AC%EB%B2%8C%EC%A7%91+%EC%95%84%EB%A5%B4%EB%B0%94%EC%9D%B4%ED%8A%B8%EC%83%9D', '로맨스', 24, false, 128340),
  ('복수는 나의 것', 'https://placehold.co/300x420?text=%EB%B3%B5%EC%88%98%EB%8A%94+%EB%82%98%EC%9D%98+%EA%B2%83', '드라마', 18, false, 95210),
  ('계약직 신입사원', 'https://placehold.co/300x420?text=%EA%B3%84%EC%95%BD%EC%A7%81+%EC%8B%A0%EC%9E%85%EC%82%AC%EC%9B%90', '오피스', 16, false, 61870),
  ('전생의 남편', 'https://placehold.co/300x420?text=%EC%A0%84%EC%83%9D%EC%9D%98+%EB%82%A8%ED%8E%B8', '판타지', 30, false, 204590),
  ('비밀 아내', 'https://placehold.co/300x420?text=%EB%B9%84%EB%B0%80+%EC%95%84%EB%82%B4', '스릴러', 20, false, 88420),
  ('사장님의 계약연애', 'https://placehold.co/300x420?text=%EC%82%AC%EC%9E%A5%EB%8B%98%EC%9D%98+%EA%B3%84%EC%95%BD%EC%97%B0%EC%95%A0', '로맨스', 22, false, 176030),
  ('시한부 재벌 3세', 'https://placehold.co/300x420?text=%EC%8B%9C%ED%95%9C%EB%B6%80+%EC%9E%AC%EB%B2%8C+3%EC%84%B8', '드라마', 14, true, 12980),
  ('이혼 변호사의 밤', 'https://placehold.co/300x420?text=%EC%9D%B4%ED%98%BC+%EB%B3%80%ED%98%B8%EC%82%AC%EC%9D%98+%EB%B0%A4', '스릴러', 12, true, 8420),
  ('회귀한 대재벌', 'https://placehold.co/300x420?text=%ED%9A%8C%EA%B7%80%ED%95%9C+%EB%8C%80%EC%9E%AC%EB%B2%8C', '판타지', 26, true, 21540),
  ('오늘부터 우리는', 'https://placehold.co/300x420?text=%EC%98%A4%EB%8A%98%EB%B6%80%ED%84%B0+%EC%9A%B0%EB%A6%AC%EB%8A%94', '로맨스', 10, true, 5310);
