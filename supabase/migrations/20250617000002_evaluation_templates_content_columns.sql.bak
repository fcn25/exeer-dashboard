-- Align evaluation_templates content columns with the app (criteria / questions_jsonb).

alter table public.evaluation_templates
  add column if not exists criteria jsonb;

alter table public.evaluation_templates
  add column if not exists questions jsonb;

alter table public.evaluation_templates
  add column if not exists content jsonb;

alter table public.evaluation_templates
  add column if not exists questions_jsonb jsonb not default '{"version":1,"questions":[]}'::jsonb;

-- Backfill questions_jsonb from criteria when present (v3 nested structure).
update public.evaluation_templates
set questions_jsonb = criteria
where questions_jsonb is null
  and criteria is not null;

update public.evaluation_templates
set questions_jsonb = questions
where questions_jsonb is null
  and questions is not null;

update public.evaluation_templates
set questions_jsonb = content
where questions_jsonb is null
  and content is not null;

update public.evaluation_templates
set questions_jsonb = coalesce(questions_jsonb, '{"version":1,"questions":[]}'::jsonb);

alter table public.evaluation_templates
  alter column questions_jsonb set default '{"version":1,"questions":[]}'::jsonb;

alter table public.evaluation_templates
  alter column questions_jsonb set not null;

create index if not exists evaluation_templates_questions_gin_idx
  on public.evaluation_templates using gin (questions_jsonb);

create index if not exists evaluation_templates_criteria_gin_idx
  on public.evaluation_templates using gin (criteria);
