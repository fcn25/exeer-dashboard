-- Payroll records: columns required by مسير الرواتب UI

alter table public.payroll_records
  add column if not exists employee_id bigint references public.employees (id) on delete cascade,
  add column if not exists payroll_month text,
  add column if not exists other_allowances numeric not null default 0,
  add column if not exists gosi_deduction numeric not null default 0,
  add column if not exists lateness_deduction numeric not null default 0,
  add column if not exists net_salary numeric not null default 0,
  add column if not exists status text not null default 'Draft';

-- Backfill payroll_month from legacy month/year columns
update public.payroll_records
set payroll_month = lpad(month::text, 2, '0') || '/' || year::text
where payroll_month is null
  and month is not null
  and year is not null;

-- Sync legacy ↔ engine column names
update public.payroll_records
set
  gosi_deduction = coalesce(nullif(gosi_deduction, 0), gosi, 0),
  lateness_deduction = coalesce(nullif(lateness_deduction, 0), delays, 0),
  net_salary = coalesce(nullif(net_salary, 0), net, 0),
  other_allowances = coalesce(nullif(other_allowances, 0), allowances, 0),
  gosi = coalesce(nullif(gosi, 0), gosi_deduction, 0),
  delays = coalesce(nullif(delays, 0), lateness_deduction, 0),
  net = coalesce(nullif(net, 0), net_salary, 0),
  allowances = coalesce(nullif(allowances, 0), other_allowances, 0)
where payroll_month is not null;

create unique index if not exists payroll_records_company_employee_month_uidx
  on public.payroll_records (company_id, employee_id, payroll_month)
  where employee_id is not null and payroll_month is not null;

create index if not exists payroll_records_payroll_month_idx
  on public.payroll_records (company_id, payroll_month);

comment on column public.payroll_records.payroll_month is 'Payroll period label, e.g. 06/2026';
