alter table public.tasks
  add column if not exists title text;

update public.tasks
set title = left(description, 80)
where title is null and description is not null;
