alter table public.employees
  add column if not exists work_permit_expiry_date date;

comment on column public.employees.work_permit_expiry_date is 'تاريخ انتهاء رخصة العمل';
