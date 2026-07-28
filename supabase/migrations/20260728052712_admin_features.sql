alter table public.profiles
  add column if not exists is_admin boolean not null default false;

update public.profiles
  set is_admin = true
  where id = (select id from auth.users where email = 'jun@techready.ai');

alter table public.dramas
  add column if not exists is_published boolean not null default true;

-- Admin-only write access to dramas; select policy from the earlier
-- migration ("Dramas are viewable by everyone") is untouched, so regular
-- users keep read-only access exactly as before.
create policy "Admins can insert dramas"
  on public.dramas for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can update dramas"
  on public.dramas for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can delete dramas"
  on public.dramas for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Base grants for insert/update/delete; RLS above narrows this down to
-- admins only. anon gets nothing beyond its existing select grant.
grant insert, update, delete on public.dramas to authenticated;

-- Member list for an admin dashboard: nickname/coin_balance live in
-- profiles, but email only exists on auth.users, which PostgREST doesn't
-- expose directly — SECURITY DEFINER lets this function read it anyway.
create or replace function public.admin_list_members()
returns table (
  id uuid,
  nickname text,
  email text,
  created_at timestamptz,
  coin_balance integer
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- `id` is qualified everywhere below because `returns table (id uuid, ...)`
  -- implicitly declares an `id` variable in this function's scope, which
  -- otherwise collides with (and shadows) profiles.id in these queries.
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true) then
    raise exception '관리자만 접근할 수 있습니다.';
  end if;

  return query
    select p.id, p.nickname, u.email::text, p.created_at, p.coin_balance
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

revoke all on function public.admin_list_members() from public;
grant execute on function public.admin_list_members() to authenticated;

-- Force-deletes a member without the password re-check delete-account
-- (the Edge Function) requires, since the caller's own admin privilege is
-- the authorization here instead of proof they know the target's password.
create or replace function public.admin_delete_user(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception '관리자만 접근할 수 있습니다.';
  end if;

  if target_user_id = auth.uid() then
    raise exception '본인 계정은 이 함수로 삭제할 수 없습니다.';
  end if;

  delete from auth.users where id = target_user_id;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
