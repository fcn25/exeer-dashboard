-- Ensures employee_loans exists (fixes approval workflow when 20250607120000 ran before table creation)

create table if not exists public.employee_loans (
  id uuid primary key default gen_random_uuid(),
  company_id bigint not null references public.companies (id) on delete cascade,
  employee_id bigint not null references public.employees (id) on delete cascade,
  monthly_installment numeric not null default 0 check (monthly_installment >= 0),
  total_amount numeric,
  installments_total integer,
  installments_remaining integer,
  start_date date,
  request_id bigint references public.requests (id) on delete set null,
  last_deducted_month text,
  status text not null default 'active' check (status in ('active', 'closed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.employee_loans
  add column if not exists total_amount numeric,
  add column if not exists installments_total integer,
  add column if not exists installments_remaining integer,
  add column if not exists start_date date,
  add column if not exists request_id bigint references public.requests (id) on delete set null,
  add column if not exists last_deducted_month text;

alter table public.payroll_records
  add column if not exists loan_deductions numeric not null default 0;

create index if not exists employee_loans_company_employee_idx
  on public.employee_loans (company_id, employee_id);

create index if not exists employee_loans_active_idx
  on public.employee_loans (company_id, status)
  where status = 'active';

create index if not exists employee_loans_request_id_idx
  on public.employee_loans (request_id)
  where request_id is not null;

alter table public.employee_loans enable row level security;

drop policy if exists employee_loans_company_all on public.employee_loans;

create policy employee_loans_company_all
  on public.employee_loans for all to authenticated
  using (company_id = public.get_my_company_id())
  with check (company_id = public.get_my_company_id());
