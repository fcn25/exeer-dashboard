-- Explicit FK: payroll_records.employee_id → employees.id
-- Run in Supabase SQL Editor if PostgREST reports a missing relationship.

alter table public.payroll_records
  add column if not exists employee_id bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payroll_records_employee_id_fkey'
      and conrelid = 'public.payroll_records'::regclass
  ) then
    alter table public.payroll_records
      add constraint payroll_records_employee_id_fkey
      foreign key (employee_id)
      references public.employees (id)
      on delete cascade;
  end if;
end $$;

create index if not exists payroll_records_employee_id_idx
  on public.payroll_records (employee_id);
