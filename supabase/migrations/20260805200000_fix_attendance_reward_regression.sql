-- 20260805130000_coin_transactions.sql restated check_attendance() from a
-- copy that predated the 20260804120000_unify_reward_coins.sql fix, so its
-- v_reward silently reverted from 30 back to 10. This restates it again with
-- the coin_transactions insert kept intact and v_reward corrected to 30.
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
  v_reward constant integer := 30;
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
