-- Lets authenticated users bind an unlinked employees row to their auth account by email.

create or replace function public.link_employee_auth_user_by_email()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text;
  v_employee_id bigint;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return null;
  end if;

  select lower(trim(u.email))
  into v_email
  from auth.users u
  where u.id = v_user_id;

  if v_email is null or v_email = '' then
    return null;
  end if;

  select e.id
  into v_employee_id
  from public.employees e
  where e.auth_user_id = v_user_id
  order by e.updated_at desc nulls last, e.id desc
  limit 1;

  if v_employee_id is not null then
    return v_employee_id;
  end if;

  update public.employees e
  set
    auth_user_id = v_user_id,
    updated_at = now()
  where e.auth_user_id is null
    and lower(trim(coalesce(e.email, ''))) = v_email
  returning e.id into v_employee_id;

  return v_employee_id;
end;
$$;

revoke all on function public.link_employee_auth_user_by_email() from public;
grant execute on function public.link_employee_auth_user_by_email() to authenticated;

comment on function public.link_employee_auth_user_by_email() is
  'Binds employees.auth_user_id to auth.uid() when emails match (case-insensitive) and the row is unlinked.';
