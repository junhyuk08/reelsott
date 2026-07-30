alter table public.profiles
  add column if not exists last_ad_reward_date date;

-- Extends the column list protect_privileged_profile_columns() already
-- guards (see 20260728062649) so a client can't PATCH last_ad_reward_date
-- directly to bypass claim_ad_reward()'s once-per-day check.
create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated' then
    if new.is_admin is distinct from old.is_admin then
      raise exception 'is_admin은 이 방식으로 변경할 수 없습니다.';
    end if;
    if new.coin_balance is distinct from old.coin_balance then
      raise exception 'coin_balance는 이 방식으로 변경할 수 없습니다.';
    end if;
    if new.last_attendance_date is distinct from old.last_attendance_date then
      raise exception 'last_attendance_date는 이 방식으로 변경할 수 없습니다.';
    end if;
    if new.consecutive_days is distinct from old.consecutive_days then
      raise exception 'consecutive_days는 이 방식으로 변경할 수 없습니다.';
    end if;
    if new.last_ad_reward_date is distinct from old.last_ad_reward_date then
      raise exception 'last_ad_reward_date는 이 방식으로 변경할 수 없습니다.';
    end if;
  end if;
  return new;
end;
$$;

-- Mirrors check_attendance()'s shape: `for update` locks the profile row so
-- a double-tap (or two rapid ad completions) can't double-grant, and the
-- protect_privileged_profile_columns trigger above blocks direct client
-- writes to last_ad_reward_date/coin_balance so this SECURITY DEFINER path
-- is the only way to earn the reward.
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
  v_reward constant integer := 20;
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

  return jsonb_build_object(
    'reward_coin', v_reward,
    'coin_balance', v_new_balance
  );
end;
$$;

revoke all on function public.claim_ad_reward() from public;
grant execute on function public.claim_ad_reward() to authenticated;
