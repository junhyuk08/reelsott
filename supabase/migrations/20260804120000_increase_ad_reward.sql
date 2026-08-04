-- Bumps the daily ad-watch coin reward from 20 to 30. Full create-or-replace
-- restatement (matching this repo's existing convention for function
-- updates, e.g. 20260730100000's own protect_privileged_profile_columns
-- restatement) rather than a partial patch, since Postgres functions are
-- replaced wholesale.
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

  return jsonb_build_object(
    'reward_coin', v_reward,
    'coin_balance', v_new_balance
  );
end;
$$;

revoke all on function public.claim_ad_reward() from public;
grant execute on function public.claim_ad_reward() to authenticated;
