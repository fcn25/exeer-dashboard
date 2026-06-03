-- Production RLS: company isolation, role-based access, service_role bypass (default)

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER — match auth user to employees.email)
-- ---------------------------------------------------------------------------

create or replace function public.get_my_employee_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.employees e
  inner join auth.users u on u.id = auth.uid()
  where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
  limit 1;
$$;

create or replace function public.get_my_company_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select e.company_id
  from public.employees e
  inner join auth.users u on u.id = auth.uid()
  where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
  limit 1;
$$;

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select e.role
  from public.employees e
  inner join auth.users u on u.id = auth.uid()
  where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
  limit 1;
$$;

create or replace function public.is_company_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_my_role(), '') = 'owner';
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
    'Executive',
    'HR_Manager',
    'HR_Assistant'
  );
$$;

grant execute on function public.get_my_employee_id() to authenticated;
grant execute on function public.get_my_company_id() to authenticated;
grant execute on function public.get_my_role() to authenticated;
grant execute on function public.is_company_owner() to authenticated;
grant execute on function public.is_company_manager() to authenticated;
grant execute on function public.is_hr_staff() to authenticated;

-- Alias for employee self-service requests table name
create or replace view public.employee_requests
with (security_invoker = true)
as
  select * from public.requests;

-- ---------------------------------------------------------------------------
-- Drop development-wide policies
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'companies',
    'employees',
    'tasks',
    'events',
    'payroll_records',
    'requests',
    'role_permissions',
    'departments',
    'job_titles',
    'leave_types',
    'pending_requests',
    'hr_job_archives'
  ]
  loop
    execute format('drop policy if exists exeer_all_select on public.%I', t);
    execute format('drop policy if exists exeer_all_insert on public.%I', t);
    execute format('drop policy if exists exeer_all_update on public.%I', t);
    execute format('drop policy if exists exeer_all_delete on public.%I', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------

alter table public.companies enable row level security;

drop policy if exists companies_select_own on public.companies;
drop policy if exists companies_insert_signup on public.companies;
drop policy if exists companies_update_owner on public.companies;

create policy companies_select_own
  on public.companies for select to authenticated
  using (id = public.get_my_company_id());

create policy companies_insert_signup
  on public.companies for insert to authenticated
  with check (public.get_my_company_id() is null);

create policy companies_update_owner
  on public.companies for update to authenticated
  using (id = public.get_my_company_id() and public.is_company_owner())
  with check (id = public.get_my_company_id() and public.is_company_owner());

-- ---------------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------------

alter table public.employees enable row level security;

drop policy if exists employees_select_company on public.employees;
drop policy if exists employees_insert_hr on public.employees;
drop policy if exists employees_update_hr on public.employees;
drop policy if exists employees_delete_owner on public.employees;

create policy employees_select_company
  on public.employees for select to authenticated
  using (
    company_id = public.get_my_company_id()
    and (
      public.is_company_manager()
      or public.is_hr_staff()
      or id = public.get_my_employee_id()
    )
  );

create policy employees_insert_hr
  on public.employees for insert to authenticated
  with check (
    company_id = public.get_my_company_id()
    and public.is_hr_staff()
  );

-- First owner row during company signup (before get_my_company_id() resolves)
drop policy if exists employees_insert_signup on public.employees;
create policy employees_insert_signup
  on public.employees for insert to authenticated
  with check (
    public.get_my_company_id() is null
    and role = 'owner'
    and lower(trim(coalesce(email, ''))) = lower(
      trim(coalesce((select u.email from auth.users u where u.id = auth.uid()), ''))
    )
  );

create policy employees_update_hr
  on public.employees for update to authenticated
  using (
    company_id = public.get_my_company_id()
    and public.is_hr_staff()
  )
  with check (company_id = public.get_my_company_id());

create policy employees_delete_owner
  on public.employees for delete to authenticated
  using (
    company_id = public.get_my_company_id()
    and public.is_company_owner()
  );

-- ---------------------------------------------------------------------------
-- payroll_records (owner only)
-- ---------------------------------------------------------------------------

alter table public.payroll_records enable row level security;

drop policy if exists payroll_records_owner_all on public.payroll_records;

create policy payroll_records_owner_all
  on public.payroll_records for all to authenticated
  using (
    company_id = public.get_my_company_id()
    and public.is_company_owner()
  )
  with check (
    company_id = public.get_my_company_id()
    and public.is_company_owner()
  );

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

alter table public.tasks enable row level security;

drop policy if exists tasks_company_all on public.tasks;

create policy tasks_company_all
  on public.tasks for all to authenticated
  using (company_id = public.get_my_company_id())
  with check (company_id = public.get_my_company_id());

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------

alter table public.events enable row level security;

drop policy if exists events_company_all on public.events;

create policy events_company_all
  on public.events for all to authenticated
  using (company_id = public.get_my_company_id())
  with check (company_id = public.get_my_company_id());

-- ---------------------------------------------------------------------------
-- requests / employee_requests
-- ---------------------------------------------------------------------------

alter table public.requests enable row level security;

drop policy if exists requests_select_company on public.requests;
drop policy if exists requests_insert_own on public.requests;
drop policy if exists requests_update_managers on public.requests;

create policy requests_select_company
  on public.requests for select to authenticated
  using (
    company_id = public.get_my_company_id()
    and (
      public.is_company_manager()
      or public.is_hr_staff()
      or employee_id = public.get_my_employee_id()
    )
  );

create policy requests_insert_own
  on public.requests for insert to authenticated
  with check (
    company_id = public.get_my_company_id()
    and employee_id = public.get_my_employee_id()
  );

create policy requests_update_managers
  on public.requests for update to authenticated
  using (
    company_id = public.get_my_company_id()
    and (public.is_company_manager() or public.is_hr_staff())
  )
  with check (company_id = public.get_my_company_id());

-- ---------------------------------------------------------------------------
-- role_permissions
-- ---------------------------------------------------------------------------

alter table public.role_permissions enable row level security;

drop policy if exists role_permissions_select_company on public.role_permissions;
drop policy if exists role_permissions_modify_owner on public.role_permissions;

create policy role_permissions_select_company
  on public.role_permissions for select to authenticated
  using (company_id = public.get_my_company_id());

create policy role_permissions_modify_owner
  on public.role_permissions for all to authenticated
  using (
    company_id = public.get_my_company_id()
    and public.is_company_owner()
  )
  with check (
    company_id = public.get_my_company_id()
    and public.is_company_owner()
  );

-- ---------------------------------------------------------------------------
-- Global HR catalogs (read-only for authenticated tenants)
-- ---------------------------------------------------------------------------

alter table public.departments enable row level security;
alter table public.job_titles enable row level security;
alter table public.leave_types enable row level security;

drop policy if exists departments_read on public.departments;
drop policy if exists job_titles_read on public.job_titles;
drop policy if exists leave_types_read on public.leave_types;

create policy departments_read
  on public.departments for select to authenticated
  using (true);

create policy job_titles_read
  on public.job_titles for select to authenticated
  using (true);

create policy leave_types_read
  on public.leave_types for select to authenticated
  using (true);

-- Owner may maintain catalogs (optional admin seeding)
drop policy if exists departments_owner_write on public.departments;
drop policy if exists job_titles_owner_write on public.job_titles;
drop policy if exists leave_types_owner_write on public.leave_types;

create policy departments_owner_write
  on public.departments for all to authenticated
  using (public.is_company_owner())
  with check (public.is_company_owner());

create policy job_titles_owner_write
  on public.job_titles for all to authenticated
  using (public.is_company_owner())
  with check (public.is_company_owner());

create policy leave_types_owner_write
  on public.leave_types for all to authenticated
  using (public.is_company_owner())
  with check (public.is_company_owner());

-- Merge can_manage_events into existing role permission JSON
update public.role_permissions
set permissions = permissions
  || jsonb_build_object(
    'can_manage_events',
    coalesce(
      permissions->'can_manage_events',
      permissions->'can_create_events',
      'false'::jsonb
    )
  )
where permissions is not null;

-- Revoke open anon access; authenticated + service_role only
do $$
declare
  t text;
begin
  foreach t in array array[
    'companies',
    'employees',
    'tasks',
    'events',
    'payroll_records',
    'requests',
    'role_permissions',
    'departments',
    'job_titles',
    'leave_types'
  ]
  loop
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated',
      t
    );
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

-- service_role bypasses RLS by default in Supabase (no policy needed)
