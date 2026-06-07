-- Link employees to Supabase Auth via auth_user_id (replaces slow email-based RLS lookups)

alter table public.employees
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

create index if not exists idx_employees_auth_user_id
  on public.employees (auth_user_id);

create unique index if not exists idx_employees_auth_user_id_unique
  on public.employees (auth_user_id)
  where auth_user_id is not null;

-- Backfill existing rows where email matches an auth user
update public.employees e
set auth_user_id = u.id
from auth.users u
where e.auth_user_id is null
  and e.email is not null
  and trim(e.email) <> ''
  and lower(trim(e.email)) = lower(trim(u.email));

-- ---------------------------------------------------------------------------
-- Auth helpers — prefer auth_user_id = auth.uid(), email match as fallback
-- ---------------------------------------------------------------------------

create or replace function public.get_my_employee_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select e.id
      from public.employees e
      where e.auth_user_id = auth.uid()
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    ),
    (
      select e.id
      from public.employees e
      inner join auth.users u on u.id = auth.uid()
      where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
        and e.company_id = nullif(trim(u.raw_user_meta_data->>'company_id'), '')::bigint
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    ),
    (
      select e.id
      from public.employees e
      inner join auth.users u on u.id = auth.uid()
      where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    )
  );
$$;

create or replace function public.get_my_company_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select e.company_id
      from public.employees e
      where e.auth_user_id = auth.uid()
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    ),
    (
      select e.company_id
      from public.employees e
      inner join auth.users u on u.id = auth.uid()
      where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
        and e.company_id = nullif(trim(u.raw_user_meta_data->>'company_id'), '')::bigint
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    ),
    (
      select e.company_id
      from public.employees e
      inner join auth.users u on u.id = auth.uid()
      where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    ),
    (
      select nullif(trim(u.raw_user_meta_data->>'company_id'), '')::bigint
      from auth.users u
      where u.id = auth.uid()
    )
  );
$$;

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select e.role
      from public.employees e
      where e.auth_user_id = auth.uid()
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    ),
    (
      select e.role
      from public.employees e
      inner join auth.users u on u.id = auth.uid()
      where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
        and e.company_id = nullif(trim(u.raw_user_meta_data->>'company_id'), '')::bigint
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    ),
    (
      select e.role
      from public.employees e
      inner join auth.users u on u.id = auth.uid()
      where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
      order by e.updated_at desc nulls last, e.id desc
      limit 1
    ),
    ''
  );
$$;

-- ---------------------------------------------------------------------------
-- employees — faster self-access via auth_user_id
-- ---------------------------------------------------------------------------

drop policy if exists employees_select_company on public.employees;

create policy employees_select_company
  on public.employees for select to authenticated
  using (
    company_id = public.get_my_company_id()
    and (
      public.is_company_manager()
      or public.is_hr_staff()
      or id = public.get_my_employee_id()
      or auth_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- employees signup policy — bind owner row to auth user directly
-- ---------------------------------------------------------------------------

drop policy if exists employees_insert_signup on public.employees;

create policy employees_insert_signup
  on public.employees for insert to authenticated
  with check (
    public.get_my_company_id() is null
    and role = 'owner'
    and (
      auth_user_id = auth.uid()
      or lower(trim(coalesce(email, ''))) = lower(
        trim(coalesce((select u.email from auth.users u where u.id = auth.uid()), ''))
      )
    )
  );

-- ---------------------------------------------------------------------------
-- employee_loans — tenant isolation via auth_user_id / company helpers
-- ---------------------------------------------------------------------------

drop policy if exists employee_loans_company_all on public.employee_loans;
drop policy if exists "Tenant isolation" on public.employee_loans;
drop policy if exists employee_loans_select on public.employee_loans;
drop policy if exists employee_loans_manage on public.employee_loans;

create policy employee_loans_select
  on public.employee_loans for select to authenticated
  using (
    company_id = public.get_my_company_id()
    and (
      public.is_hr_staff()
      or public.is_company_manager()
      or exists (
        select 1
        from public.employees e
        where e.id = employee_loans.employee_id
          and e.auth_user_id = auth.uid()
      )
    )
  );

create policy employee_loans_manage
  on public.employee_loans for all to authenticated
  using (
    company_id = public.get_my_company_id()
    and (public.is_hr_staff() or public.is_company_manager())
  )
  with check (
    company_id = public.get_my_company_id()
    and (public.is_hr_staff() or public.is_company_manager())
  );

-- ---------------------------------------------------------------------------
-- Other functions that matched employees by email
-- ---------------------------------------------------------------------------

create or replace function public.list_employees_without_auth_account(
  p_company_id bigint
)
returns table (
  id bigint,
  full_name text,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.full_name, e.email
  from public.employees e
  where e.email is not null
    and trim(e.email) <> ''
    and e.company_id = p_company_id
    and p_company_id = public.get_my_company_id()
    and e.auth_user_id is null
  order by e.full_name;
$$;

create or replace function public.verify_attendance_geofence(
  emp_user_id uuid,
  current_lat double precision,
  current_lng double precision
)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_work_location_id uuid;
  v_branch_lat double precision;
  v_branch_lng double precision;
  v_radius_meters double precision;
  v_distance double precision;
begin
  if emp_user_id is distinct from auth.uid() then
    raise exception 'unauthorized geofence verification';
  end if;

  select e.work_location_id
  into v_work_location_id
  from public.employees e
  where e.auth_user_id = auth.uid()
  order by e.updated_at desc nulls last, e.id desc
  limit 1;

  if v_work_location_id is null then
    select e.work_location_id
    into v_work_location_id
    from public.employees e
    inner join auth.users u on u.id = auth.uid()
    where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
    order by e.updated_at desc nulls last, e.id desc
    limit 1;
  end if;

  if v_work_location_id is null then
    return json_build_object(
      'is_within_radius', false,
      'distance_meters', null
    );
  end if;

  select b.latitude, b.longitude, b.radius_meters
  into v_branch_lat, v_branch_lng, v_radius_meters
  from public.company_branches b
  where b.id = v_work_location_id
  limit 1;

  if v_branch_lat is null or v_branch_lng is null or v_radius_meters is null then
    return json_build_object(
      'is_within_radius', false,
      'distance_meters', null
    );
  end if;

  v_distance := st_distancesphere(
    st_makepoint(current_lng, current_lat),
    st_makepoint(v_branch_lng, v_branch_lat)
  );

  return json_build_object(
    'is_within_radius', v_distance <= v_radius_meters,
    'distance_meters', v_distance
  );
end;
$$;

create or replace function public.notify_evaluation_assignments(
  p_employee_ids bigint[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id bigint;
  v_user_id uuid;
  v_inserted integer := 0;
begin
  if p_employee_ids is null or array_length(p_employee_ids, 1) is null then
    return 0;
  end if;

  foreach v_employee_id in array p_employee_ids loop
    select coalesce(e.auth_user_id, u.id)
    into v_user_id
    from public.employees e
    left join auth.users u
      on e.auth_user_id is null
     and e.email is not null
     and trim(e.email) <> ''
     and lower(trim(u.email)) = lower(trim(e.email))
    where e.id = v_employee_id
    limit 1;

    if v_user_id is not null then
      insert into public.notifications (user_id, title, message, type)
      values (
        v_user_id,
        'تقييم أداء جديد',
        'تم تعيين نموذج تقييم جديد لإدارتك. يرجى إكماله.',
        'evaluation_assigned'
      );
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  return v_inserted;
end;
$$;

grant execute on function public.get_my_company_id() to authenticated;
grant execute on function public.get_my_employee_id() to authenticated;
grant execute on function public.get_my_role() to authenticated;

comment on column public.employees.auth_user_id is
  'Supabase Auth user linked to this employee row (preferred over email matching in RLS).';

notify pgrst, 'reload schema';
