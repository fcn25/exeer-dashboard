-- Request approval workflow: structured leave/financial fields + loan schedule

alter table public.requests
  add column if not exists leave_type text,
  add column if not exists leave_days numeric,
  add column if not exists start_date date;

alter table public.employee_loans
  add column if not exists total_amount numeric,
  add column if not exists installments_total integer,
  add column if not exists installments_remaining integer,
  add column if not exists start_date date,
  add column if not exists request_id bigint references public.requests (id) on delete set null,
  add column if not exists last_deducted_month text;

create index if not exists employee_loans_request_id_idx
  on public.employee_loans (request_id)
  where request_id is not null;
