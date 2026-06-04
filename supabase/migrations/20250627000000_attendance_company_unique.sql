-- Multi-tenant unique key for attendance upserts (per company, employee, day)

alter table public.attendance_records
  drop constraint if exists attendance_records_employee_date_unique;

drop index if exists public.attendance_records_employee_date_unique;

create unique index if not exists attendance_records_company_employee_date_uidx
  on public.attendance_records (company_id, employee_id, record_date);
