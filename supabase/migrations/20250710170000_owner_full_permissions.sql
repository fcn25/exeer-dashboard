-- Ensure primary subscriber (company owner) has full tenant access.
-- Legacy "Admin" rows and RLS helpers must match application owner role.

update public.employees
set role = 'owner'
where role in ('Admin', 'admin', 'مدير', 'مدير النظام');

create or replace function public.is_company_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_my_role(), '') in ('owner', 'Admin');
$$;

comment on function public.is_company_owner() is
  'True for company owner (owner or legacy Admin role).';
