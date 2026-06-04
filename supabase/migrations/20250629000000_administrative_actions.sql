-- Administrative actions (HR → employee, no approval chain)

create table if not exists public.administrative_actions (
  id uuid primary key default gen_random_uuid(),
  company_id bigint not null references public.companies (id) on delete cascade,
  employee_id bigint not null references public.employees (id) on delete cascade,
  action_type text not null
    check (
      action_type in (
        'Alert',
        'First Warning',
        'Second Warning',
        'Third Warning',
        'salary deduction',
        'suspension'
      )
    ),
  reason text not null,
  penalty_amount numeric,
  action_date timestamptz not null default now(),
  issued_by_name text,
  created_at timestamptz not null default now()
);

create index if not exists administrative_actions_company_id_idx
  on public.administrative_actions (company_id);

create index if not exists administrative_actions_employee_id_idx
  on public.administrative_actions (employee_id);

create index if not exists administrative_actions_action_date_idx
  on public.administrative_actions (company_id, employee_id, action_date desc);

alter table public.administrative_actions enable row level security;

drop policy if exists administrative_actions_hr_read on public.administrative_actions;
drop policy if exists administrative_actions_hr_write on public.administrative_actions;
drop policy if exists administrative_actions_employee_read on public.administrative_actions;

create policy administrative_actions_hr_read
  on public.administrative_actions for select to authenticated
  using (
    company_id = public.get_my_company_id()
    and (
      public.is_company_owner()
      or coalesce(public.get_my_role(), '') in ('Executive', 'HR_Manager', 'HR_Assistant')
    )
  );

create policy administrative_actions_hr_write
  on public.administrative_actions for insert to authenticated
  with check (
    company_id = public.get_my_company_id()
    and (
      public.is_company_owner()
      or coalesce(public.get_my_role(), '') in ('Executive', 'HR_Manager', 'HR_Assistant')
    )
  );

create policy administrative_actions_employee_read
  on public.administrative_actions for select to authenticated
  using (
    company_id = public.get_my_company_id()
    and employee_id = public.get_my_employee_id()
  );

comment on table public.administrative_actions is 'Direct HR administrative actions issued to employees';
