-- Resolve tenant when the same email exists in multiple companies:
-- 1) Prefer auth.users.raw_user_meta_data.company_id when it matches an employee row
-- 2) Otherwise pick the most recently updated employees row (updated_at DESC)

create or replace function public.get_my_company_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select e.company_id
      from public.employees e
      inner join auth.users u on u.id = auth.uid()
      where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
        and e.company_id = nullif(trim(u.raw_user_meta_data->>'company_id'), '')::bigint
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    ),
    (
      select e.company_id
      from public.employees e
      inner join auth.users u on u.id = auth.uid()
      where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    ),
    (
      select nullif(trim(u.raw_user_meta_data->>'company_id'), '')::bigint
      from auth.users u
      where u.id = auth.uid()
    )
  );
$$;

create or replace function public.get_my_employee_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select e.id
      from public.employees e
      inner join auth.users u on u.id = auth.uid()
      where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
        and e.company_id = nullif(trim(u.raw_user_meta_data->>'company_id'), '')::bigint
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    ),
    (
      select e.id
      from public.employees e
      inner join auth.users u on u.id = auth.uid()
      where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    )
  );
$$;

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select e.role
      from public.employees e
      inner join auth.users u on u.id = auth.uid()
      where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
        and e.company_id = nullif(trim(u.raw_user_meta_data->>'company_id'), '')::bigint
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    ),
    (
      select e.role
      from public.employees e
      inner join auth.users u on u.id = auth.uid()
      where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    ),
    ''
  );
$$;

grant execute on function public.get_my_company_id() to authenticated;
grant execute on function public.get_my_employee_id() to authenticated;
grant execute on function public.get_my_role() to authenticated;

comment on function public.get_my_company_id() is
  'Resolves tenant: user_metadata.company_id first (if employee match), else latest employees.updated_at.';
