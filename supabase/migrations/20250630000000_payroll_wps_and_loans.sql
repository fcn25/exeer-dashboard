-- WPS bank fields, employee loans, payroll sync columns

alter table public.employees
  add column if not exists bank_name text,
  add column if not exists transport_allowance numeric not null default 0;

alter table public.payroll_records
  add column if not exists transport_allowance numeric not null default 0,
  add column if not exists loan_deductions numeric not null default 0;

create table if not exists public.employee_loans (
  id uuid primary key default gen_random_uuid(),
  company_id bigint not null references public.companies (id) on delete cascade,
  employee_id bigint not null references public.employees (id) on delete cascade,
  monthly_installment numeric not null default 0 check (monthly_installment >= 0),
  status text not null default 'active' check (status in ('active', 'closed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_loans_company_employee_idx
  on public.employee_loans (company_id, employee_id);

create index if not exists employee_loans_active_idx
  on public.employee_loans (company_id, status)
  where status = 'active';

alter table public.employee_loans enable row level security;

drop policy if exists employee_loans_company_all on public.employee_loans;

create policy employee_loans_company_all
  on public.employee_loans for all to authenticated
  using (company_id = public.get_my_company_id())
  with check (company_id = public.get_my_company_id());
