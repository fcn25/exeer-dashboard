-- Separate automated delay deductions from administrative penalties

alter table public.payroll_records
  add column if not exists delay_deductions numeric not null default 0,
  add column if not exists penalty_deductions numeric not null default 0;

comment on column public.payroll_records.delay_deductions is 'Automated lateness from attendance (time delays)';
comment on column public.payroll_records.penalty_deductions is 'Administrative penalties (manual HR)';

update public.payroll_records
set
  delay_deductions = coalesce(nullif(delay_deductions, 0), lateness_deduction, delays, 0),
  penalty_deductions = coalesce(nullif(penalty_deductions, 0), penalties, 0)
where delay_deductions = 0 and penalty_deductions = 0;
