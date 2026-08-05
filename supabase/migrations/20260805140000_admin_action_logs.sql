-- Audit trail for sensitive admin-only actions (account deletion, admin
-- grant/revoke). admin_id/target_user_id use ON DELETE SET NULL rather than
-- CASCADE — the whole point of an audit log is to survive the accounts it
-- references. In particular, admin_delete_user logs *then* deletes the
-- target in the same transaction; CASCADE here would let that delete erase
-- the very row documenting it.
create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users (id) on delete set null,
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_action_logs enable row level security;

create policy "Admins can view action logs"
  on public.admin_action_logs for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

grant select on public.admin_action_logs to authenticated;
-- No insert/update/delete grant — only the SECURITY DEFINER admin functions
-- write here, same as coin_transactions/attendance_logs/unlocked_episodes.

-- Restated to log before deleting (see table comment above for why the
-- ordering matters). Validation, exception messages, and return shape are
-- otherwise unchanged from the original.
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

  insert into public.admin_action_logs (admin_id, action, target_user_id)
    values (auth.uid(), 'delete_user', target_user_id);

  delete from auth.users where id = target_user_id;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
