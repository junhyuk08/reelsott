-- admin_list_members had no way to page/search/sort — fine for a handful of
-- members, not for an actual admin screen. Postgres treats a different
-- parameter list as a distinct overload rather than a replacement, so the
-- old zero-arg version has to be dropped explicitly or both would coexist
-- and a bare `admin_list_members()` call would keep resolving to the old one.
drop function if exists public.admin_list_members();

create or replace function public.admin_list_members(
  p_limit integer default 50,
  p_offset integer default 0,
  p_search text default null,
  p_sort_by text default 'created_at',
  p_sort_dir text default 'desc'
)
returns table (
  id uuid,
  nickname text,
  email text,
  created_at timestamptz,
  coin_balance integer,
  is_admin boolean,
  total_count bigint
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_sort_by text;
  v_sort_dir text;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true) then
    raise exception '관리자만 접근할 수 있습니다.';
  end if;

  -- Whitelisted, not interpolated from raw input — column/direction go
  -- through %I/%s in the query below, but only after being funneled through
  -- this fixed set of literals.
  v_sort_by := case lower(coalesce(p_sort_by, 'created_at'))
    when 'nickname' then 'nickname'
    when 'coin_balance' then 'coin_balance'
    when 'created_at' then 'created_at'
    else 'created_at'
  end;

  v_sort_dir := case lower(coalesce(p_sort_dir, 'desc'))
    when 'asc' then 'asc'
    else 'desc'
  end;

  return query execute format(
    $q$
    select p.id, p.nickname, u.email::text, p.created_at, p.coin_balance, p.is_admin,
      count(*) over() as total_count
    from public.profiles p
    join auth.users u on u.id = p.id
    where ($1 is null or p.nickname ilike '%%' || $1 || '%%' or u.email ilike '%%' || $1 || '%%')
    order by %I %s
    limit $2 offset $3
    $q$,
    v_sort_by, v_sort_dir
  )
  using p_search, least(coalesce(p_limit, 50), 200), greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.admin_list_members(integer, integer, text, text, text) from public;
grant execute on function public.admin_list_members(integer, integer, text, text, text) to authenticated;

-- Member detail for the admin panel: profile plus the activity an admin
-- would actually want to see when investigating a member — capped at the
-- 50 most recent rows per section, since this is meant to be a summary, not
-- a full export.
create or replace function public.admin_get_member_detail(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile jsonb;
  v_watch_history jsonb;
  v_favorites jsonb;
  v_attendance_logs jsonb;
  v_coin_transactions jsonb;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception '관리자만 접근할 수 있습니다.';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'nickname', p.nickname,
    'email', u.email,
    'created_at', p.created_at,
    'coin_balance', p.coin_balance,
    'is_admin', p.is_admin,
    'consecutive_days', p.consecutive_days,
    'last_attendance_date', p.last_attendance_date,
    'last_ad_reward_date', p.last_ad_reward_date
  )
  into v_profile
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = target_user_id;

  if v_profile is null then
    raise exception '회원을 찾을 수 없습니다.';
  end if;

  select coalesce(jsonb_agg(row_to_json(row)), '[]'::jsonb) into v_watch_history
  from (
    select wh.drama_id, d.title as drama_title, wh.watched_at, wh.last_episode_id
    from public.watch_history wh
    join public.dramas d on d.id = wh.drama_id
    where wh.user_id = target_user_id
    order by wh.watched_at desc
    limit 50
  ) row;

  select coalesce(jsonb_agg(row_to_json(row)), '[]'::jsonb) into v_favorites
  from (
    select f.drama_id, d.title as drama_title, f.created_at
    from public.favorites f
    join public.dramas d on d.id = f.drama_id
    where f.user_id = target_user_id
    order by f.created_at desc
    limit 50
  ) row;

  select coalesce(jsonb_agg(row_to_json(row)), '[]'::jsonb) into v_attendance_logs
  from (
    select al.checked_date, al.reward_coin
    from public.attendance_logs al
    where al.user_id = target_user_id
    order by al.checked_date desc
    limit 50
  ) row;

  select coalesce(jsonb_agg(row_to_json(row)), '[]'::jsonb) into v_coin_transactions
  from (
    select ct.amount, ct.reason, ct.balance_after, ct.created_at
    from public.coin_transactions ct
    where ct.user_id = target_user_id
    order by ct.created_at desc
    limit 50
  ) row;

  return jsonb_build_object(
    'profile', v_profile,
    'watch_history', v_watch_history,
    'favorites', v_favorites,
    'attendance_logs', v_attendance_logs,
    'coin_transactions', v_coin_transactions
  );
end;
$$;

revoke all on function public.admin_get_member_detail(uuid) from public;
grant execute on function public.admin_get_member_detail(uuid) to authenticated;

-- Until now the only admin was set via a one-off UPDATE in a migration
-- (20260728052712) — no in-app way to add or remove one. Both log to
-- admin_action_logs like admin_delete_user does.
create or replace function public.admin_grant_admin(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception '관리자만 접근할 수 있습니다.';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception '회원을 찾을 수 없습니다.';
  end if;

  -- SECURITY DEFINER runs as the function owner, not 'authenticated', so
  -- protect_privileged_profile_columns' current_user check doesn't block
  -- this — same mechanism check_attendance etc. already rely on for
  -- coin_balance.
  update public.profiles set is_admin = true where id = target_user_id;

  insert into public.admin_action_logs (admin_id, action, target_user_id)
    values (auth.uid(), 'grant_admin', target_user_id);

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.admin_grant_admin(uuid) from public;
grant execute on function public.admin_grant_admin(uuid) to authenticated;

create or replace function public.admin_revoke_admin(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception '관리자만 접근할 수 있습니다.';
  end if;

  if target_user_id = auth.uid() then
    raise exception '본인의 관리자 권한은 이 방식으로 해제할 수 없습니다.';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception '회원을 찾을 수 없습니다.';
  end if;

  update public.profiles set is_admin = false where id = target_user_id;

  insert into public.admin_action_logs (admin_id, action, target_user_id)
    values (auth.uid(), 'revoke_admin', target_user_id);

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.admin_revoke_admin(uuid) from public;
grant execute on function public.admin_revoke_admin(uuid) to authenticated;
