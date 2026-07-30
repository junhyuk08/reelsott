create or replace function public.increment_view_count(target_drama_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dramas set view_count = view_count + 1 where id = target_drama_id;
end;
$$;

grant execute on function public.increment_view_count(uuid) to anon, authenticated;
