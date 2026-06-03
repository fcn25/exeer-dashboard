-- Align live DB with frontend: companies billing columns + tasks.ai_source
-- (Same as supabase/scripts/fix_missing_schema_columns.sql)

alter table public.companies
  add column if not exists plan_status text;

alter table public.companies
  add column if not exists trial_ends_at timestamptz;

alter table public.companies
  alter column trial_ends_at drop not null;

update public.companies
set plan_status = coalesce(nullif(trim(plan_status), ''), 'trial')
where plan_status is null;

update public.companies
set trial_ends_at = coalesce(trial_ends_at, created_at + interval '14 days')
where trial_ends_at is null;

alter table public.companies
  alter column plan_status set default 'trial';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_plan_status_check'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies
      add constraint companies_plan_status_check
      check (
        plan_status is null
        or plan_status in ('trial', 'active', 'expired', 'cancelled')
      );
  end if;
end $$;

alter table public.tasks
  add column if not exists ai_source text;

create index if not exists tasks_company_ai_source_created_idx
  on public.tasks (company_id, ai_source, created_at desc)
  where ai_source is not null;
