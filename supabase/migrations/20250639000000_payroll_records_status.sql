-- payroll_records.status: draft | exported

update public.payroll_records pr
set status = lower(trim(pr.status))
from public.payroll_runs r
where pr.run_id = r.id
  and r.status is distinct from 'locked'
  and pr.status is not null;

update public.payroll_records pr
set status = 'draft'
from public.payroll_runs r
where pr.run_id = r.id
  and r.status is distinct from 'locked'
  and (
    pr.status is null
    or pr.status not in ('draft', 'exported')
  );

alter table public.payroll_records
  alter column status set default 'draft';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'payroll_records_status_check'
      and conrelid = 'public.payroll_records'::regclass
  ) then
    alter table public.payroll_records
      drop constraint payroll_records_status_check;
  end if;

  alter table public.payroll_records
    add constraint payroll_records_status_check
    check (status in ('draft', 'exported'));
end $$;
