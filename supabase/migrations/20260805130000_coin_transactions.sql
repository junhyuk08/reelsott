-- Coin transaction ledger. coin_balance on profiles was always just an
-- integer that gets overwritten in place — attendance had its own log table,
-- but ad rewards and episode unlocks left no record of *why* a balance
-- changed. This backfills a single place admins (and later, users) can see
-- the full history.
create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null,
  reason text not null check (reason in ('attendance', 'ad_reward', 'episode_unlock', 'charge')),
  balance_after integer not null,
  created_at timestamptz not null default now()
);

alter table public.coin_transactions enable row level security;

create policy "Users can view their own coin transactions"
  on public.coin_transactions for select
  using (auth.uid() = user_id);

-- No insert/update/delete grant to anon/authenticated — only the
-- SECURITY DEFINER functions below (and admin_get_member_detail, read-only)
-- ever touch this table, same shape as attendance_logs/unlocked_episodes.
grant select on public.coin_transactions to authenticated;

-- Below: check_attendance, claim_ad_reward, unlock_episode restated in full
-- (matching this repo's convention for updating a function) with one added
-- insert into coin_transactions each. Everything else — validation order,
-- exception messages, return shape — is byte-for-byte the same as before,
-- so existing callers see no behavior change beyond the new ledger row.

create or replace function public.check_attendance()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := current_date;
  v_last_date date;
  v_consecutive integer;
  v_new_consecutive integer;
  v_new_balance integer;
  v_reward constant integer := 10;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select last_attendance_date, consecutive_days
    into v_last_date, v_consecutive
    from public.profiles
    where id = v_user_id
    for update;

  if not found then
    raise exception '프로필을 찾을 수 없습니다.';
  end if;

  if v_last_date = v_today then
    raise exception '이미 출석체크를 완료했습니다.';
  end if;

  if v_last_date = v_today - 1 then
    v_new_consecutive := v_consecutive + 1;
  else
    v_new_consecutive := 1;
  end if;

  update public.profiles
    set coin_balance = coin_balance + v_reward,
        last_attendance_date = v_today,
        consecutive_days = v_new_consecutive
    where id = v_user_id
    returning coin_balance into v_new_balance;

  insert into public.attendance_logs (user_id, checked_date, reward_coin)
    values (v_user_id, v_today, v_reward);

  insert into public.coin_transactions (user_id, amount, reason, balance_after)
    values (v_user_id, v_reward, 'attendance', v_new_balance);

  return jsonb_build_object(
    'reward_coin', v_reward,
    'coin_balance', v_new_balance,
    'consecutive_days', v_new_consecutive
  );
end;
$$;

revoke all on function public.check_attendance() from public;
grant execute on function public.check_attendance() to authenticated;

create or replace function public.claim_ad_reward()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := current_date;
  v_last_date date;
  v_new_balance integer;
  v_reward constant integer := 30;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select last_ad_reward_date into v_last_date
    from public.profiles
    where id = v_user_id
    for update;

  if not found then
    raise exception '프로필을 찾을 수 없습니다.';
  end if;

  if v_last_date = v_today then
    raise exception '오늘은 이미 광고 보너스를 받았습니다.';
  end if;

  update public.profiles
    set coin_balance = coin_balance + v_reward,
        last_ad_reward_date = v_today
    where id = v_user_id
    returning coin_balance into v_new_balance;

  insert into public.coin_transactions (user_id, amount, reason, balance_after)
    values (v_user_id, v_reward, 'ad_reward', v_new_balance);

  return jsonb_build_object(
    'reward_coin', v_reward,
    'coin_balance', v_new_balance
  );
end;
$$;

revoke all on function public.claim_ad_reward() from public;
grant execute on function public.claim_ad_reward() to authenticated;

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

  insert into public.coin_transactions (user_id, amount, reason, balance_after)
    values (v_user_id, -v_cost, 'episode_unlock', v_new_balance);

  return jsonb_build_object(
    'unlocked', true,
    'coin_spent', v_cost,
    'coin_balance', v_new_balance
  );
end;
$$;

revoke all on function public.unlock_episode(uuid) from public;
grant execute on function public.unlock_episode(uuid) to authenticated;
