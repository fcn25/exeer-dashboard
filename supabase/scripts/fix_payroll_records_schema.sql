-- Run in Supabase SQL Editor if payroll_month / salary columns are missing, then reload schema cache.

alter table public.payroll_records
  add column if not exists employee_id bigint references public.employees (id) on delete cascade,
  add column if not exists payroll_month text,
  add column if not exists other_allowances numeric not null default 0,
  add column if not exists gosi_deduction numeric not null default 0,
  add column if not exists lateness_deduction numeric not null default 0,
  add column if not exists net_salary numeric not null default 0,
  add column if not exists status text not null default 'Draft';

update public.payroll_records
set payroll_month = lpad(month::text, 2, '0') || '/' || year::text
where payroll_month is null
  and month is not null
  and year is not null;

create unique index if not exists payroll_records_company_employee_month_uidx
  on public.payroll_records (company_id, employee_id, payroll_month)
  where employee_id is not null and payroll_month is not null;

create index if not exists payroll_records_payroll_month_idx
  on public.payroll_records (company_id, payroll_month);
