alter table public.profiles
  add column if not exists coin_balance integer not null default 0,
  add column if not exists last_attendance_date date,
  add column if not exists consecutive_days integer not null default 0;

create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  checked_date date not null,
  reward_coin integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, checked_date)
);

alter table public.attendance_logs enable row level security;

create policy "Users can view their own attendance logs"
  on public.attendance_logs for select
  using (auth.uid() = user_id);

-- Only the check_attendance() function below writes here (as owner, via
-- SECURITY DEFINER) — no insert/update/delete grants for anon/authenticated,
-- so attendance can't be recorded except through its validated flow.
grant select on public.attendance_logs to authenticated;

-- Runs as the table owner so it can update profiles/insert attendance_logs
-- regardless of the caller's own grants; `for update` locks the profile row
-- for the transaction so two concurrent check-ins can't both succeed.
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

  return jsonb_build_object(
    'reward_coin', v_reward,
    'coin_balance', v_new_balance,
    'consecutive_days', v_new_consecutive
  );
end;
$$;

revoke all on function public.check_attendance() from public;
grant execute on function public.check_attendance() to authenticated;
