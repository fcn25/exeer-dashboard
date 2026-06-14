-- Task activity thread: unified comments + status changes, RLS, realtime, notifications.
-- Schema facts (verified): public.tasks, status text, assigned_to_id bigint, bigint PKs.
-- RLS helpers: get_my_company_id(), get_my_employee_id(), get_my_role() (not current_user_*).

-- ---------------------------------------------------------------------------
-- Task creator FK (no prior sender column on tasks)
-- ---------------------------------------------------------------------------

alter table public.tasks
  add column if not exists created_by_id bigint references public.employees (id) on delete set null;

create index if not exists tasks_created_by_id_idx on public.tasks (created_by_id);

create or replace function public.tasks_set_created_by_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by_id is null then
    new.created_by_id := public.get_my_employee_id();
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_set_created_by_id_trg on public.tasks;
create trigger tasks_set_created_by_id_trg
  before insert on public.tasks
  for each row
  execute function public.tasks_set_created_by_id();

-- ---------------------------------------------------------------------------
-- Enum + task_activity table
-- ---------------------------------------------------------------------------

do $$
begin
  create type public.task_activity_kind as enum ('comment', 'status_change');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.task_activity (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks (id) on delete cascade,
  company_id bigint not null references public.companies (id) on delete cascade,
  author_employee_id bigint references public.employees (id) on delete set null,
  kind public.task_activity_kind not null,
  body text,
  meta jsonb,
  attachment_url text,
  created_at timestamptz not null default now()
);

create index if not exists task_activity_task_created_idx
  on public.task_activity (task_id, created_at);

-- company_id always derived from the parent task
create or replace function public.task_activity_set_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id bigint;
begin
  select t.company_id
  into v_company_id
  from public.tasks t
  where t.id = new.task_id;

  if v_company_id is null then
    raise exception 'task not found for task_activity insert';
  end if;

  new.company_id := v_company_id;
  return new;
end;
$$;

drop trigger if exists task_activity_set_company_id_trg on public.task_activity;
create trigger task_activity_set_company_id_trg
  before insert on public.task_activity
  for each row
  execute function public.task_activity_set_company_id();

-- ---------------------------------------------------------------------------
-- Access helper: task participants + oversight roles
-- Direct_Manager scope via agent_get_team_employee_ids() (no manager_id column)
-- ---------------------------------------------------------------------------

create or replace function public.can_access_task(p_task_id bigint)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_task record;
  v_role text := coalesce(public.get_my_role(), '');
  v_employee_id bigint := public.get_my_employee_id();
begin
  if p_task_id is null then
    return false;
  end if;

  select t.company_id, t.assigned_to_id, t.created_by_id
  into v_task
  from public.tasks t
  where t.id = p_task_id;

  if not found then
    return false;
  end if;

  if v_task.company_id is distinct from public.get_my_company_id() then
    return false;
  end if;

  if v_role in ('owner', 'Executive', 'HR_Manager') then
    return true;
  end if;

  if v_employee_id is not null
    and (
      v_task.assigned_to_id = v_employee_id
      or v_task.created_by_id = v_employee_id
    ) then
    return true;
  end if;

  if v_role = 'Direct_Manager'
    and v_task.assigned_to_id is not null
    and v_task.assigned_to_id = any(public.agent_get_team_employee_ids()) then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.can_access_task(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Status change auto-log (AFTER UPDATE on tasks.status)
-- ---------------------------------------------------------------------------

create or replace function public.task_log_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.task_activity (
      task_id,
      company_id,
      author_employee_id,
      kind,
      meta
    )
    values (
      new.id,
      new.company_id,
      public.get_my_employee_id(),
      'status_change',
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists task_log_status_change_trg on public.tasks;
create trigger task_log_status_change_trg
  after update of status on public.tasks
  for each row
  execute function public.task_log_status_change();

-- ---------------------------------------------------------------------------
-- Notifications (reuse existing notifications table + RPC pattern)
-- ---------------------------------------------------------------------------

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'request_approved',
      'new_employee',
      'subscription_alert',
      'evaluation_assigned',
      'account_deletion_request',
      'task_comment',
      'task_mention'
    )
  );

create or replace function public.resolve_employee_auth_user_id(p_employee_id bigint)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(e.auth_user_id, u.id)
  from public.employees e
  left join auth.users u
    on e.auth_user_id is null
   and e.email is not null
   and trim(e.email) <> ''
   and lower(trim(u.email)) = lower(trim(e.email))
  where e.id = p_employee_id
  limit 1;
$$;

create or replace function public.task_activity_notify_participants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task record;
  v_author_name text;
  v_user_id uuid;
  v_mention bigint;
  v_notified bigint[] := array[]::bigint[];
  v_task_label text;
begin
  if new.kind <> 'comment' then
    return new;
  end if;

  select t.assigned_to_id, t.created_by_id, t.title, t.description
  into v_task
  from public.tasks t
  where t.id = new.task_id;

  select coalesce(e.full_name, 'موظف')
  into v_author_name
  from public.employees e
  where e.id = new.author_employee_id;

  v_task_label := coalesce(
    nullif(trim(v_task.title), ''),
    nullif(trim(split_part(coalesce(v_task.description, ''), E'\n', 1)), ''),
    'مهمة'
  );

  if v_task.assigned_to_id is not null
    and v_task.assigned_to_id is distinct from new.author_employee_id
    and not (v_task.assigned_to_id = any(v_notified)) then
    v_user_id := public.resolve_employee_auth_user_id(v_task.assigned_to_id);
    if v_user_id is not null then
      insert into public.notifications (user_id, title, message, type)
      values (
        v_user_id,
        'تعليق جديد على مهمة',
        coalesce(v_author_name, 'موظف')
          || ' علّق على المهمة «' || v_task_label || '».',
        'task_comment'
      );
      v_notified := array_append(v_notified, v_task.assigned_to_id);
    end if;
  end if;

  if v_task.created_by_id is not null
    and v_task.created_by_id is distinct from new.author_employee_id
    and not (v_task.created_by_id = any(v_notified)) then
    v_user_id := public.resolve_employee_auth_user_id(v_task.created_by_id);
    if v_user_id is not null then
      insert into public.notifications (user_id, title, message, type)
      values (
        v_user_id,
        'تعليق جديد على مهمة',
        coalesce(v_author_name, 'موظف')
          || ' علّق على المهمة «' || v_task_label || '».',
        'task_comment'
      );
      v_notified := array_append(v_notified, v_task.created_by_id);
    end if;
  end if;

  if new.meta ? 'mentions' then
    for v_mention in
      select distinct (value::text)::bigint
      from jsonb_array_elements(new.meta->'mentions') as value
      where value::text ~ '^\d+$'
    loop
      if v_mention is distinct from new.author_employee_id
        and not (v_mention = any(v_notified)) then
        v_user_id := public.resolve_employee_auth_user_id(v_mention);
        if v_user_id is not null then
          insert into public.notifications (user_id, title, message, type)
          values (
            v_user_id,
            'إشارة في تعليق مهمة',
            coalesce(v_author_name, 'موظف') || ' أشار إليك في تعليق على مهمة.',
            'task_mention'
          );
          v_notified := array_append(v_notified, v_mention);
        end if;
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists task_activity_notify_participants_trg on public.task_activity;
create trigger task_activity_notify_participants_trg
  after insert on public.task_activity
  for each row
  execute function public.task_activity_notify_participants();

-- ---------------------------------------------------------------------------
-- RLS on task_activity (immutable audit log — SELECT + INSERT comments only)
-- ---------------------------------------------------------------------------

alter table public.task_activity enable row level security;

drop policy if exists task_activity_select on public.task_activity;
drop policy if exists task_activity_insert_comment on public.task_activity;

create policy task_activity_select
  on public.task_activity
  for select
  to authenticated
  using (
    company_id = public.get_my_company_id()
    and public.can_access_task(task_id)
  );

create policy task_activity_insert_comment
  on public.task_activity
  for insert
  to authenticated
  with check (
    kind = 'comment'
    and company_id = public.get_my_company_id()
    and author_employee_id = public.get_my_employee_id()
    and public.can_access_task(task_id)
  );

-- ---------------------------------------------------------------------------
-- Storage: task-attachments bucket (path: {company_id}/{task_id}/{filename})
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('task-attachments', 'task-attachments', true, 5242880)
on conflict (id) do update
set file_size_limit = 5242880;

drop policy if exists task_attachments_select on storage.objects;
drop policy if exists task_attachments_insert on storage.objects;
drop policy if exists task_attachments_update on storage.objects;
drop policy if exists task_attachments_delete on storage.objects;

create policy task_attachments_select on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'task-attachments'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
  );

create policy task_attachments_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'task-attachments'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
  );

create policy task_attachments_update on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'task-attachments'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
  );

create policy task_attachments_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'task-attachments'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
  );

-- ---------------------------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.task_activity;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

notify pgrst, 'reload schema';
