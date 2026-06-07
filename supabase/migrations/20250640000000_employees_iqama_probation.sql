alter table public.employees
  add column if not exists iqama_expiry_date date,
  add column if not exists probation_end_date date,
  add column if not exists iqama_number text;
