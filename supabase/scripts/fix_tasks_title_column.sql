-- Run in Supabase Dashboard → SQL Editor
-- Fixes: Could not find the 'title' column of 'tasks' in the schema cache

alter table public.tasks
  add column if not exists title text;

alter table public.tasks
  add column if not exists description text;

-- Backfill title from description for legacy rows
update public.tasks
set title = left(trim(description), 120)
where title is null
  and description is not null
  and trim(description) <> '';

update public.tasks
set description = coalesce(nullif(trim(description), ''), '—')
where description is null or trim(description) = '';

notify pgrst, 'reload schema';
