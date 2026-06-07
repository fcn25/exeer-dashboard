-- payroll_records.status: draft | exported

update public.payroll_records
set status = lower(trim(status))
where status is not null;

update public.payroll_records
set status = 'draft'
where status is null
   or status not in ('draft', 'exported');

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
