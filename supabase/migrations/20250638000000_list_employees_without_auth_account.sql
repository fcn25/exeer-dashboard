-- Employees with email but no matching auth.users row (for bulk invite)

drop function if exists public.list_employees_without_auth_account(bigint);

create or replace function public.list_employees_without_auth_account(
  p_company_id bigint
)
returns table (
  id bigint,
  full_name text,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.full_name, e.email
  from public.employees e
  where e.email is not null
    and trim(e.email) <> ''
    and e.company_id = p_company_id
    and p_company_id = public.get_my_company_id()
    and not exists (
      select 1
      from auth.users u
      where lower(trim(u.email)) = lower(trim(e.email))
    )
  order by e.full_name;
$$;

grant execute on function public.list_employees_without_auth_account(bigint) to authenticated;

comment on function public.list_employees_without_auth_account(bigint) is
  'Returns company employees who have an email but no auth account yet.';
