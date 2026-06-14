-- Self-service account deletion (Apple Guideline 5.1.1)
-- Soft-delete employee rows; disable auth (not delete) for 30-day recovery window.

alter table public.employees
  add column if not exists is_active boolean not null default true,
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_scheduled_purge_at timestamptz,
  add column if not exists deleted_by bigint references public.employees (id) on delete set null;

create index if not exists employees_deletion_scheduled_purge_idx
  on public.employees (deletion_scheduled_purge_at)
  where deletion_scheduled_purge_at is not null;

create index if not exists employees_company_active_idx
  on public.employees (company_id, is_active);

comment on column public.employees.is_active is
  'False when the employee requested account deletion (auth disabled; row kept for recovery).';
comment on column public.employees.deletion_requested_at is
  'When the employee (or owner) requested self-service account deletion.';
comment on column public.employees.deletion_scheduled_purge_at is
  'Hard purge target: deletion_requested_at + 30 days.';
comment on column public.employees.deleted_by is
  'Employee id that initiated the deletion (usually self).';

-- Owner-initiated deletion schedules the whole company for purge.
alter table public.companies
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_scheduled_purge_at timestamptz;

create index if not exists companies_deletion_scheduled_purge_idx
  on public.companies (deletion_scheduled_purge_at)
  where deletion_scheduled_purge_at is not null;

-- Enrich deletion audit table (edge function writes via service role).
alter table public.account_deletion_requests
  add column if not exists employee_id bigint references public.employees (id) on delete set null,
  add column if not exists company_id bigint references public.companies (id) on delete set null,
  add column if not exists scope text not null default 'employee';

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_scope_check;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_scope_check check (
    scope in ('employee', 'company')
  );

-- Notification type for owner alerts when an employee requests deletion.
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'request_approved',
      'new_employee',
      'subscription_alert',
      'evaluation_assigned',
      'account_deletion_request'
    )
  );

-- Prefer active employee rows for auth helpers (deleted rows kept for recovery).
create or replace function public.get_my_employee_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select e.id
      from public.employees e
      where e.auth_user_id = auth.uid()
        and coalesce(e.is_active, true) = true
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    ),
    (
      select e.id
      from public.employees e
      inner join auth.users u on u.id = auth.uid()
      where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
        and e.company_id = nullif(trim(u.raw_user_meta_data->>'company_id'), '')::bigint
        and coalesce(e.is_active, true) = true
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    ),
    (
      select e.id
      from public.employees e
      inner join auth.users u on u.id = auth.uid()
      where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
        and coalesce(e.is_active, true) = true
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    )
  );
$$;

notify pgrst, 'reload schema';
