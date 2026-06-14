-- calendar_appointments.created_by = employee bigint (not auth uuid)

alter table public.calendar_appointments
  drop constraint if exists calendar_appointments_created_by_fkey;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'calendar_appointments'
      and column_name = 'created_by'
      and udt_name = 'uuid'
  ) then
    alter table public.calendar_appointments
      add column if not exists created_by_employee_id bigint;

    update public.calendar_appointments ca
    set created_by_employee_id = e.id
    from public.employees e
    where e.auth_user_id = ca.created_by;

    update public.calendar_appointments ca
    set created_by_employee_id = e.id
    from public.employees e
    inner join auth.users u on u.id = ca.created_by
    where ca.created_by_employee_id is null
      and lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')));

    alter table public.calendar_appointments drop column created_by;
    alter table public.calendar_appointments
      rename column created_by_employee_id to created_by;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'calendar_appointments'
      and column_name = 'created_by'
      and udt_name <> 'int8'
  ) then
    alter table public.calendar_appointments
      alter column created_by type bigint using created_by::bigint;
  end if;
end $$;

alter table public.calendar_appointments
  drop constraint if exists calendar_appointments_created_by_employee_fkey;

alter table public.calendar_appointments
  add constraint calendar_appointments_created_by_employee_fkey
  foreign key (created_by) references public.employees (id) on delete set null;

drop policy if exists calendar_appointments_select_own on public.calendar_appointments;
drop policy if exists calendar_appointments_insert_own on public.calendar_appointments;
drop policy if exists calendar_appointments_update_own on public.calendar_appointments;
drop policy if exists calendar_appointments_delete_own on public.calendar_appointments;

create policy calendar_appointments_select_own
  on public.calendar_appointments for select to authenticated
  using (
    company_id = public.get_my_company_id()
    and created_by = public.get_my_employee_id()
  );

create policy calendar_appointments_insert_own
  on public.calendar_appointments for insert to authenticated
  with check (
    company_id = public.get_my_company_id()
    and created_by = public.get_my_employee_id()
  );

create policy calendar_appointments_update_own
  on public.calendar_appointments for update to authenticated
  using (
    company_id = public.get_my_company_id()
    and created_by = public.get_my_employee_id()
  )
  with check (
    company_id = public.get_my_company_id()
    and created_by = public.get_my_employee_id()
  );

create policy calendar_appointments_delete_own
  on public.calendar_appointments for delete to authenticated
  using (
    company_id = public.get_my_company_id()
    and created_by = public.get_my_employee_id()
  );

create index if not exists calendar_appointments_employee_date_idx
  on public.calendar_appointments (company_id, created_by, appointment_date);
