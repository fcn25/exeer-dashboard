-- Optional: run if your employees table was created before flat-schema fields
alter table public.employees
  add column if not exists national_address text,
  add column if not exists other_allowance numeric not null default 0;

update public.employees
set national_address = coalesce(national_address, address)
where national_address is null and address is not null;
