-- Link employees to geofenced company branches for biometric punch validation.

alter table public.employees
  add column if not exists work_location_id uuid
    references public.company_branches (id) on delete set null;

create index if not exists employees_work_location_id_idx
  on public.employees (work_location_id);

comment on column public.employees.work_location_id is
  'Assigned company branch for attendance geofence (FK → company_branches.id).';
