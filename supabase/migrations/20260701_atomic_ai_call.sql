-- Atomic AI-call consumption. Replaces a read-then-write in application code
-- (select ai_calls_used, check limit, update) which is a classic
-- check-then-act race under concurrent requests -- two requests can both
-- read "4 used, limit 5," both pass the check, and both write 5, letting a
-- user go over their cap. The row lock (FOR UPDATE) inside this function
-- serializes concurrent callers on the same profile row, so the check and
-- the increment happen as one atomic unit.
create or replace function consume_ai_call(p_user_id uuid, p_limit int)
returns table (ok boolean, used int, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used int;
  v_reset_at timestamptz;
  v_now timestamptz := now();
begin
  select p.ai_calls_used, p.ai_calls_reset_at into v_used, v_reset_at
  from profiles p
  where p.id = p_user_id
  for update;

  if not found then
    return query select false, 0, v_now;
    return;
  end if;

  if v_reset_at is null or v_now >= v_reset_at then
    v_used := 0;
    v_reset_at := date_trunc('month', v_now) + interval '1 month';
  end if;

  if v_used >= p_limit then
    update profiles set ai_calls_reset_at = v_reset_at where id = p_user_id;
    return query select false, v_used, v_reset_at;
    return;
  end if;

  update profiles
  set ai_calls_used = v_used + 1, ai_calls_reset_at = v_reset_at
  where id = p_user_id;

  return query select true, v_used + 1, v_reset_at;
end;
$$;

revoke all on function consume_ai_call(uuid, int) from public;
grant execute on function consume_ai_call(uuid, int) to authenticated, service_role;
