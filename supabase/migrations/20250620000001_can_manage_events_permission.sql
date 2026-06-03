-- Ensure can_manage_events exists on default JSON template
alter table public.role_permissions
  alter column permissions set default '{
    "can_edit_employees": false,
    "can_view_payroll": false,
    "can_create_events": false,
    "can_manage_events": false,
    "can_approve_financial": false,
    "can_approve_general": false,
    "can_access_employee_profile": false
  }'::jsonb;

update public.role_permissions
set permissions = permissions || '{"can_manage_events": true}'::jsonb
where coalesce(permissions->>'can_create_events', 'false') = 'true'
  and coalesce(permissions->>'can_manage_events', 'false') = 'false';
