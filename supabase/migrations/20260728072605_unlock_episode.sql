create table if not exists public.unlocked_episodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  episode_id uuid not null references public.episodes (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, episode_id)
);

alter table public.unlocked_episodes enable row level security;

create policy "Users can view their own unlocked episodes"
  on public.unlocked_episodes for select
  using (auth.uid() = user_id);

-- Only unlock_episode() below writes here (as owner, via SECURITY DEFINER)
-- — no insert/update/delete grants for authenticated, so an unlock can't
-- happen except through the coin-charging flow.
grant select on public.unlocked_episodes to authenticated;

-- Mirrors check_attendance()'s shape: `for update` locks the profile row so
-- a double-tap can't double-charge, and the same
-- protect_privileged_profile_columns trigger lets this SECURITY DEFINER
-- function touch coin_balance while blocking direct client writes to it.
create or replace function public.unlock_episode(target_episode_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_episode_number integer;
  v_drama_id uuid;
  v_free_episode_count integer;
  v_balance integer;
  v_new_balance integer;
  v_cost constant integer := 30;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select episode_number, drama_id into v_episode_number, v_drama_id
    from public.episodes
    where id = target_episode_id;

  if not found then
    raise exception '회차를 찾을 수 없습니다.';
  end if;

  select free_episode_count into v_free_episode_count
    from public.dramas
    where id = v_drama_id;

  if v_episode_number <= v_free_episode_count then
    raise exception '무료 회차는 잠금해제가 필요 없습니다.';
  end if;

  if exists (
    select 1 from public.unlocked_episodes
    where user_id = v_user_id and episode_id = target_episode_id
  ) then
    raise exception '이미 잠금해제된 회차입니다.';
  end if;

  select coin_balance into v_balance
    from public.profiles
    where id = v_user_id
    for update;

  if not found then
    raise exception '프로필을 찾을 수 없습니다.';
  end if;

  if v_balance < v_cost then
    raise exception '코인이 부족합니다.';
  end if;

  update public.profiles
    set coin_balance = coin_balance - v_cost
    where id = v_user_id
    returning coin_balance into v_new_balance;

  insert into public.unlocked_episodes (user_id, episode_id)
    values (v_user_id, target_episode_id);

  return jsonb_build_object(
    'unlocked', true,
    'coin_spent', v_cost,
    'coin_balance', v_new_balance
  );
end;
$$;

revoke all on function public.unlock_episode(uuid) from public;
grant execute on function public.unlock_episode(uuid) to authenticated;
