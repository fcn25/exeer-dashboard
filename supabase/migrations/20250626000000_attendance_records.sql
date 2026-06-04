-- Time & Attendance records (read-only in UI; data via CSV import)

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  company_id bigint not null references public.companies (id) on delete cascade,
  employee_id bigint not null references public.employees (id) on delete cascade,
  record_date date not null,
  check_in_1 time,
  check_out_1 time,
  check_in_2 time,
  check_out_2 time,
  status text not null default 'حضور'
    check (status in ('حضور', 'غياب', 'إجازة')),
  delay_minutes integer not null default 0 check (delay_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_records_company_employee_date_unique
    unique (company_id, employee_id, record_date)
);

create index if not exists attendance_records_company_date_idx
  on public.attendance_records (company_id, record_date);

create index if not exists attendance_records_employee_id_idx
  on public.attendance_records (employee_id);

create or replace function public.set_attendance_records_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists attendance_records_updated_at on public.attendance_records;

create trigger attendance_records_updated_at
  before update on public.attendance_records
  for each row
  execute function public.set_attendance_records_updated_at();

alter table public.attendance_records enable row level security;

drop policy if exists attendance_records_owner_all on public.attendance_records;

create policy attendance_records_owner_all
  on public.attendance_records for all to authenticated
  using (
    company_id = public.get_my_company_id()
    and public.is_company_owner()
  )
  with check (
    company_id = public.get_my_company_id()
    and public.is_company_owner()
  );

comment on table public.attendance_records is 'Biometric attendance rows; UI is read-only, imports via CSV';
