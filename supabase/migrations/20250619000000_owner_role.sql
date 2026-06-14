-- Company owner role (replaces Admin for account owners)

alter table public.employees
  drop constraint if exists employees_role_check;

update public.employees
set role = 'owner'
where role in ('Admin', 'admin', 'مدير', 'مدير النظام');

alter table public.employees
  add constraint employees_role_check
  check (
    role in (
      'owner',
      'Executive',
      'HR_Manager',
      'HR_Assistant',
      'Direct_Manager',
      'Employee',
      'Accountant'
    )
  );
