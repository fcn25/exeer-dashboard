-- Per-employee work period assignment for attendance / biometric punches.

alter table public.employees
  add column if not exists work_period_ids jsonb not null default '["period_1"]'::jsonb;

comment on column public.employees.work_period_ids is
  'Assigned company work period ids (period_1, period_2) for attendance punches.';
