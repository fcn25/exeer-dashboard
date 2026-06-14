-- Legacy evaluation cleanup (DO NOT RUN until approved in production).
-- evaluation_cycles is intentionally preserved for the new performance system.

alter table if exists public.evaluation_cycles
  drop constraint if exists evaluation_cycles_template_id_fkey;

alter table if exists public.evaluation_cycles
  alter column template_id drop not null;

DROP TABLE IF EXISTS evaluation_responses;
DROP TABLE IF EXISTS employee_evaluations;
DROP TABLE IF EXISTS evaluation_templates;
