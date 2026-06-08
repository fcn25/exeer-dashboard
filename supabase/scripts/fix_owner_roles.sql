-- Run in Supabase SQL Editor to fix all primary subscriber (owner) accounts.
-- Safe to run multiple times.

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

create or replace function public.is_company_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_my_role(), '') in (
    'owner',
    'Admin',
    'Executive',
    'HR_Manager',
    'Direct_Manager'
  );
$$;

create or replace function public.is_hr_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_my_role(), '') in (
    'owner',
    'Admin',
    'Executive',
    'HR_Manager',
    'HR_Assistant'
  );
$$;

-- Verify owners after update:
-- select id, email, role, company_id, employee_number from public.employees
-- where employee_number = 'EMP-001' or role in ('owner', 'Admin')
-- order by company_id;
