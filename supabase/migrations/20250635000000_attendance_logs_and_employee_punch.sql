-- Biometric punch audit log + employee self-service punch policies

create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  company_id bigint not null references public.companies (id) on delete cascade,
  employee_id bigint not null references public.employees (id) on delete cascade,
  branch_id uuid references public.company_branches (id) on delete set null,
  punch_type text not null check (punch_type in ('In', 'Out')),
  punched_at timestamptz not null default now(),
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists attendance_logs_company_punched_idx
  on public.attendance_logs (company_id, punched_at desc);

create index if not exists attendance_logs_employee_punched_idx
  on public.attendance_logs (employee_id, punched_at desc);

alter table public.attendance_logs enable row level security;

drop policy if exists attendance_logs_select_own on public.attendance_logs;
drop policy if exists attendance_logs_select_managers on public.attendance_logs;
drop policy if exists attendance_logs_insert_own on public.attendance_logs;

create policy attendance_logs_select_own
  on public.attendance_logs for select to authenticated
  using (
    company_id = public.get_my_company_id()
    and employee_id = public.get_my_employee_id()
  );

create policy attendance_logs_select_managers
  on public.attendance_logs for select to authenticated
  using (
    company_id = public.get_my_company_id()
    and (public.is_company_manager() or public.is_hr_staff())
  );

create policy attendance_logs_insert_own
  on public.attendance_logs for insert to authenticated
  with check (
    company_id = public.get_my_company_id()
    and employee_id = public.get_my_employee_id()
  );

-- Employees may punch in/out on their own daily attendance row
drop policy if exists attendance_records_employee_insert on public.attendance_records;
drop policy if exists attendance_records_employee_update on public.attendance_records;

create policy attendance_records_employee_insert
  on public.attendance_records for insert to authenticated
  with check (
    company_id = public.get_my_company_id()
    and employee_id = public.get_my_employee_id()
  );

create policy attendance_records_employee_update
  on public.attendance_records for update to authenticated
  using (
    company_id = public.get_my_company_id()
    and employee_id = public.get_my_employee_id()
  )
  with check (
    company_id = public.get_my_company_id()
    and employee_id = public.get_my_employee_id()
  );

comment on table public.attendance_logs is
  'Immutable audit trail for biometric/geofenced attendance punches.';

-- Optional PostGIS geofence RPC (enable postgis extension first):
-- create or replace function public.is_within_branch_geofence(
--   p_branch_id uuid,
--   p_latitude double precision,
--   p_longitude double precision
-- ) returns boolean ...
