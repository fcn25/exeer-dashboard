-- Optional leave balance on employee record (days remaining)
alter table public.employees
  add column if not exists leave_balance numeric not null default 0;

comment on column public.employees.leave_balance is 'Remaining annual leave balance in days';
