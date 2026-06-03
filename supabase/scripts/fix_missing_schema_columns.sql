-- Run in Supabase Dashboard → SQL Editor
-- Adds columns expected by the Exeer dashboard frontend

-- ---------------------------------------------------------------------------
-- companies: PLG billing / trial tracking
-- ---------------------------------------------------------------------------
alter table public.companies
  add column if not exists plan_status text;

alter table public.companies
  add column if not exists trial_ends_at timestamptz;

-- Ensure nullable (in case an older migration set NOT NULL)
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

-- Keep trial_ends_at nullable; default only applies on new inserts when omitted
comment on column public.companies.plan_status is 'trial | active | expired | cancelled';
comment on column public.companies.trial_ends_at is 'Trial end timestamp (nullable until set)';

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

-- ---------------------------------------------------------------------------
-- tasks: AI feature attribution (Smart Tasks rate limits, analytics)
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column if not exists ai_source text;

comment on column public.tasks.ai_source is 'e.g. smart_tasks — nullable for manual tasks';

create index if not exists tasks_company_ai_source_created_idx
  on public.tasks (company_id, ai_source, created_at desc)
  where ai_source is not null;

-- Reload PostgREST schema cache so the API sees new columns immediately
notify pgrst, 'reload schema';
