-- Separate automated delay deductions from administrative penalties

alter table public.payroll_records
  add column if not exists delay_deductions numeric not null default 0,
  add column if not exists penalty_deductions numeric not null default 0;

comment on column public.payroll_records.delay_deductions is 'Automated lateness from attendance (time delays)';
comment on column public.payroll_records.penalty_deductions is 'Administrative penalties (manual HR)';

update public.payroll_records pr
set
  delay_deductions = coalesce(nullif(pr.delay_deductions, 0), pr.lateness_deduction, pr.delays, 0),
  penalty_deductions = coalesce(nullif(pr.penalty_deductions, 0), pr.penalties, 0)
from public.payroll_runs r
where pr.run_id = r.id
  and r.status is distinct from 'locked'
  and pr.delay_deductions = 0
  and pr.penalty_deductions = 0;
