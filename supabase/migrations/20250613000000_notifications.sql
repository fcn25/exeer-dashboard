-- In-app notifications for authenticated users

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (
    type in ('request_approved', 'new_employee', 'subscription_alert')
  )
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_id_unread_idx
  on public.notifications (user_id)
  where is_read = false;

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
drop policy if exists notifications_update_own on public.notifications;

create policy notifications_select_own
  on public.notifications
  for select
  using (auth.uid() = user_id);

create policy notifications_update_own
  on public.notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
