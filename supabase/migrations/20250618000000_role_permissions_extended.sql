-- Fix missing columns and extend role_permissions (employee profile access + assigned employees)

alter table public.role_permissions
  add column if not exists updated_at timestamptz not null default now();

alter table public.role_permissions
  add column if not exists assigned_employees bigint[] not null default '{}';

update public.role_permissions
set permissions = permissions || '{"can_access_employee_profile": false}'::jsonb
where not (permissions ? 'can_access_employee_profile');

alter table public.role_permissions
  alter column permissions set default '{
    "can_edit_employees": false,
    "can_view_payroll": false,
    "can_create_events": false,
    "can_approve_financial": false,
    "can_approve_general": false,
    "can_access_employee_profile": false
  }'::jsonb;
