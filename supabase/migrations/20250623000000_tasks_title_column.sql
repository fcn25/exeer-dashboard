-- Ensure tasks.title exists (frontend task board + create form)

alter table public.tasks
  add column if not exists title text;

update public.tasks
set title = left(trim(description), 120)
where title is null
  and description is not null
  and trim(description) <> '';
