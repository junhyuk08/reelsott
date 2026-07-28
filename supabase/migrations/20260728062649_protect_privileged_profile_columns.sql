-- "Users can update their own profile" (from the very first migration) is a
-- row-level policy — it lets a user touch their own row, but RLS has no
-- concept of column-level restriction, so it was silently letting anyone
-- PATCH their own is_admin/coin_balance/last_attendance_date/consecutive_days
-- directly via the REST API — the last two would let a user fake yesterday's
-- date to keep abusing check_attendance()'s streak bonus.
--
-- SECURITY DEFINER functions (check_attendance(), the initial admin grant
-- run from the SQL editor, any future admin-promotion function) execute as
-- the function/session owner, not as the 'authenticated' role — so this
-- trigger only blocks direct client writes to these columns, without
-- touching how those trusted code paths update them.
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
  end if;
  return new;
end;
$$;

drop trigger if exists protect_privileged_profile_columns on public.profiles;

create trigger protect_privileged_profile_columns
  before update on public.profiles
  for each row
  execute function public.protect_privileged_profile_columns();
