-- Smart Agent: deterministic query RPCs + digest + Gemini usage logging

-- ─── Usage / audit (Gemini fallback only) ───────────────────────────────────

create table if not exists public.agent_usage (
  company_id bigint not null references public.companies (id) on delete cascade,
  usage_date date not null,
  gemini_calls integer not null default 0,
  primary key (company_id, usage_date)
);

create table if not exists public.agent_command_log (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  employee_id bigint not null references public.employees (id) on delete cascade,
  raw_text text not null,
  tool_name text,
  command_type text not null check (command_type in ('read', 'write')),
  status text not null check (status in ('done', 'refused', 'error')),
  result_summary text,
  created_at timestamptz not null default now()
);

create index if not exists agent_command_log_employee_created_idx
  on public.agent_command_log (employee_id, created_at desc);

alter table public.agent_usage enable row level security;
alter table public.agent_command_log enable row level security;

drop policy if exists agent_command_log_select_own on public.agent_command_log;
create policy agent_command_log_select_own
  on public.agent_command_log for select to authenticated
  using (employee_id = public.get_my_employee_id());

drop policy if exists agent_command_log_insert_own on public.agent_command_log;
create policy agent_command_log_insert_own
  on public.agent_command_log for insert to authenticated
  with check (
    employee_id = public.get_my_employee_id()
    and company_id = public.get_my_company_id()
  );

drop policy if exists agent_usage_select_company on public.agent_usage;
create policy agent_usage_select_company
  on public.agent_usage for select to authenticated
  using (company_id = public.get_my_company_id());

create or replace function public.get_agent_gemini_usage_today()
returns integer
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select gemini_calls from public.agent_usage
     where company_id = public.get_my_company_id() and usage_date = current_date),
    0
  );
$$;

create or replace function public.increment_agent_gemini_usage()
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_company_id bigint; v_count integer;
begin
  v_company_id := public.get_my_company_id();
  if v_company_id is null then raise exception 'company not resolved'; end if;
  insert into public.agent_usage (company_id, usage_date, gemini_calls)
  values (v_company_id, current_date, 1)
  on conflict (company_id, usage_date)
  do update set gemini_calls = public.agent_usage.gemini_calls + 1
  returning gemini_calls into v_count;
  return v_count;
end;
$$;

grant execute on function public.get_agent_gemini_usage_today() to authenticated;
grant execute on function public.increment_agent_gemini_usage() to authenticated;
grant select, insert on public.agent_command_log to authenticated;
grant select on public.agent_usage to authenticated;

-- ─── Internal helpers ───────────────────────────────────────────────────────

create or replace function public.agent_is_active_status(p_status text)
returns boolean
language sql immutable
as $$
  select coalesce(trim(p_status), '') not in ('منتهي الخدمة', 'موقوف')
    and not (
      lower(trim(coalesce(p_status, ''))) in ('منتهي', 'مستقيل', 'terminated', 'resigned', 'inactive')
      or lower(trim(coalesce(p_status, ''))) like '%منتهي%'
    );
$$;

create or replace function public.agent_is_saudi(p_nationality text)
returns boolean
language sql immutable
as $$
  select lower(trim(coalesce(p_nationality, ''))) in ('سعودي', 'سعودية', 'saudi', 'sa', 'ksa');
$$;

create or replace function public.agent_next_contract_anniversary(p_hire_date date)
returns date
language plpgsql immutable
as $$
declare v_today date := current_date; v_end date;
begin
  if p_hire_date is null then return null; end if;
  v_end := make_date(
    extract(year from v_today)::int,
    extract(month from p_hire_date)::int,
    least(extract(day from p_hire_date)::int, 28)
  );
  if extract(day from p_hire_date)::int > 28 then
    v_end := (date_trunc('month', make_date(extract(year from v_today)::int,
      extract(month from p_hire_date)::int, 1)) + interval '1 month' - interval '1 day')::date;
    if extract(day from p_hire_date)::int <= extract(day from v_end)::int then
      v_end := make_date(extract(year from v_today)::int, extract(month from p_hire_date)::int,
        extract(day from p_hire_date)::int);
    end if;
  end if;
  if v_end <= v_today then
    v_end := v_end + interval '1 year';
  end if;
  return v_end;
end;
$$;

create or replace function public.agent_is_hr_oversight()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.get_my_role(), '') in (
    'owner', 'Executive', 'HR_Manager', 'HR_Assistant'
  );
$$;

create or replace function public.agent_get_team_employee_ids()
returns bigint[]
language plpgsql stable security definer set search_path = public
as $$
declare
  v_company_id bigint := public.get_my_company_id();
  v_manager_id bigint := public.get_my_employee_id();
  v_manager_name text;
  v_assigned bigint[];
begin
  if v_company_id is null or v_manager_id is null then return array[]::bigint[]; end if;
  select full_name into v_manager_name from public.employees where id = v_manager_id;
  select coalesce(rp.assigned_employees, array[]::bigint[]) into v_assigned
  from public.role_permissions rp
  where rp.company_id = v_company_id and rp.role_name = 'Direct_Manager'
  limit 1;
  return array(
    select distinct e.id
    from public.employees e
    where e.company_id = v_company_id
      and (
        e.id = any(coalesce(v_assigned, array[]::bigint[]))
        or (v_manager_name is not null and lower(trim(coalesce(e.direct_manager_name, ''))) = lower(trim(v_manager_name)))
      )
  );
end;
$$;

create or replace function public.agent_request_needs_my_approval(p_routing_to text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case
    when public.agent_is_hr_oversight() then true
    when coalesce(public.get_my_role(), '') = 'Direct_Manager'
      and coalesce(p_routing_to, '') in ('Direct_Manager', '') then true
    when coalesce(public.get_my_role(), '') in ('HR_Manager', 'HR_Assistant')
      and coalesce(p_routing_to, '') = 'HR_Manager' then true
    else false
  end;
$$;

-- ─── Read query RPCs ────────────────────────────────────────────────────────

create or replace function public.q_active_employees_count()
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare v_count integer;
begin
  select count(*)::integer into v_count
  from public.employees e
  where e.company_id = public.get_my_company_id()
    and public.agent_is_active_status(e.employment_status);

  return jsonb_build_object(
    'result_type', 'count',
    'answer_text', format('يوجد %s موظفاً نشطاً في شركتك.', v_count),
    'data', jsonb_build_object('count', v_count)
  );
end;
$$;

create or replace function public.q_attendance_today()
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare
  v_company_id bigint := public.get_my_company_id();
  v_today date := current_date;
  v_working integer := 0;
  v_on_leave_att integer := 0;
  v_late integer := 0;
  v_leave_status integer := 0;
  v_on_leave integer;
begin
  select
    count(*) filter (where ar.status = 'حضور'),
    count(*) filter (where ar.status = 'إجازة'),
    count(*) filter (where coalesce(ar.delay_minutes, 0) > 0)
  into v_working, v_on_leave_att, v_late
  from public.attendance_records ar
  where ar.company_id = v_company_id and ar.record_date = v_today;

  select count(*)::integer into v_leave_status
  from public.employees e
  where e.company_id = v_company_id
    and trim(coalesce(e.employment_status, '')) = 'إجازة';

  v_on_leave := greatest(v_on_leave_att, v_leave_status);

  return jsonb_build_object(
    'result_type', 'pulse',
    'answer_text', format('نبض اليوم: %s يعملون، %s في إجازة، %s متأخرون.', v_working, v_on_leave, v_late),
    'data', jsonb_build_object('working', v_working, 'onLeave', v_on_leave, 'late', v_late)
  );
end;
$$;

create or replace function public.q_iqamas_expiring(p_days integer default 30)
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 365));
  v_items jsonb;
  v_count integer;
begin
  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.days_remaining), '[]'::jsonb), count(*)
  into v_items, v_count
  from (
    select
      e.id as employee_id,
      e.full_name,
      coalesce(e.job_title_name, '—') as subtitle,
      e.iqama_expiry_date as end_date,
      (e.iqama_expiry_date - current_date) as days_remaining,
      case
        when (e.iqama_expiry_date - current_date) = 0 then 'اليوم'
        when (e.iqama_expiry_date - current_date) = 1 then 'يوم واحد'
        when (e.iqama_expiry_date - current_date) = 2 then 'يومان'
        when (e.iqama_expiry_date - current_date) between 3 and 10
          then (e.iqama_expiry_date - current_date)::text || ' أيام'
        else (e.iqama_expiry_date - current_date)::text || ' يوم'
      end as detail
    from public.employees e
    where e.company_id = public.get_my_company_id()
      and public.agent_is_active_status(e.employment_status)
      and not public.agent_is_saudi(e.nationality)
      and e.iqama_expiry_date is not null
      and e.iqama_expiry_date >= current_date
      and e.iqama_expiry_date <= current_date + v_days
  ) x;

  return jsonb_build_object(
    'result_type', 'list',
    'answer_text', case when v_count = 0 then format('لا توجد إقامات تنتهي خلال %s يوماً.', v_days)
      else format('وُجد %s موظفاً تنتهي إقامتهم خلال %s يوماً.', v_count, v_days) end,
    'data', jsonb_build_object('items', coalesce(v_items, '[]'::jsonb), 'list_kind', 'iqama_expiry')
  );
end;
$$;

create or replace function public.q_contracts_expiring(p_days integer default 90)
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 90), 365));
  v_items jsonb;
  v_count integer;
begin
  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.days_remaining), '[]'::jsonb), count(*)
  into v_items, v_count
  from (
    select
      e.id as employee_id,
      e.full_name,
      coalesce(e.job_title_name, '—') as subtitle,
      public.agent_next_contract_anniversary(e.hire_date) as end_date,
      (public.agent_next_contract_anniversary(e.hire_date) - current_date) as days_remaining,
      case
        when (public.agent_next_contract_anniversary(e.hire_date) - current_date) = 0 then 'اليوم'
        when (public.agent_next_contract_anniversary(e.hire_date) - current_date) = 1 then 'يوم واحد'
        when (public.agent_next_contract_anniversary(e.hire_date) - current_date) = 2 then 'يومان'
        when (public.agent_next_contract_anniversary(e.hire_date) - current_date) between 3 and 10
          then (public.agent_next_contract_anniversary(e.hire_date) - current_date)::text || ' أيام'
        else (public.agent_next_contract_anniversary(e.hire_date) - current_date)::text || ' يوم'
      end || ' على الذكرى' as detail
    from public.employees e
    where e.company_id = public.get_my_company_id()
      and public.agent_is_active_status(e.employment_status)
      and e.hire_date is not null
      and public.agent_next_contract_anniversary(e.hire_date) >= current_date
      and public.agent_next_contract_anniversary(e.hire_date) <= current_date + v_days
  ) x;

  return jsonb_build_object(
    'result_type', 'list',
    'answer_text', case when v_count = 0 then format('لا توجد ذكرى عقد سنوي خلال %s يوماً.', v_days)
      else format('وُجد %s موظفاً تقترب ذكرى عقدهم خلال %s يوماً.', v_count, v_days) end,
    'data', jsonb_build_object('items', coalesce(v_items, '[]'::jsonb), 'list_kind', 'contract_anniversary')
  );
end;
$$;

create or replace function public.q_employees_without_annual_leave()
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare v_year_start date := make_date(extract(year from current_date)::int, 1, 1);
  v_items jsonb; v_count integer;
begin
  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.full_name), '[]'::jsonb), count(*)
  into v_items, v_count
  from (
    select
      e.id as employee_id,
      e.full_name,
      coalesce(e.job_title_name, '—') as subtitle,
      ('رصيد ' || coalesce(e.leave_balance, 0)::text || ' يوم') as detail
    from public.employees e
    where e.company_id = public.get_my_company_id()
      and public.agent_is_active_status(e.employment_status)
      and not exists (
        select 1 from public.requests r
        where r.company_id = e.company_id
          and r.employee_id = e.id
          and r.request_type = 'Leave'
          and r.status = 'Approved'
          and r.start_date >= v_year_start
          and (
            lower(coalesce(r.leave_type, '')) like '%سنو%'
            or lower(coalesce(r.leave_type, '')) like '%annual%'
          )
      )
  ) x;

  return jsonb_build_object(
    'result_type', 'list',
    'answer_text', case when v_count = 0 then 'جميع الموظفين النشطين أخذوا إجازة سنوية هذا العام.'
      else format('%s موظفاً نشطاً لم يأخذ إجازة سنوية هذا العام.', v_count) end,
    'data', jsonb_build_object('items', coalesce(v_items, '[]'::jsonb), 'list_kind', 'no_annual_leave')
  );
end;
$$;

create or replace function public.q_pending_approvals()
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare
  v_company_id bigint := public.get_my_company_id();
  v_role text := coalesce(public.get_my_role(), '');
  v_team bigint[] := public.agent_get_team_employee_ids();
  v_items jsonb; v_count integer;
begin
  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc), '[]'::jsonb), count(*)
  into v_items, v_count
  from (
    select
      r.id as request_id,
      r.employee_id,
      coalesce(emp.full_name, 'موظف') as full_name,
      case r.request_type
        when 'Financial' then 'طلب مالي'
        when 'Leave' then 'طلب إجازة'
        else 'طلب عام'
      end as subtitle,
      left(coalesce(r.details, ''), 80) as detail,
      r.created_at
    from public.requests r
    left join public.employees emp on emp.id = r.employee_id
    where r.company_id = v_company_id
      and r.status = 'Pending'
      and (
        public.agent_is_hr_oversight()
        or (v_role = 'Direct_Manager' and r.employee_id = any(v_team))
        or (
          v_role not in ('Direct_Manager')
          and not public.agent_is_hr_oversight()
          and public.agent_request_needs_my_approval(r.routing_to)
        )
      )
    limit 50
  ) x;

  return jsonb_build_object(
    'result_type', 'list',
    'answer_text', case when v_count = 0 then 'لا توجد طلبات معلقة تحتاج موافقتك.'
      else format('لديك %s طلباً معلقاً بانتظار الموافقة.', v_count) end,
    'data', jsonb_build_object('items', coalesce(v_items, '[]'::jsonb), 'list_kind', 'pending_approvals')
  );
end;
$$;

create or replace function public.q_employee_search(p_term text)
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare
  v_term text := trim(coalesce(p_term, ''));
  v_items jsonb;
  v_count integer;
begin
  if length(v_term) < 2 then
    return jsonb_build_object(
      'result_type', 'search',
      'answer_text', '',
      'data', jsonb_build_object('candidates', '[]'::jsonb)
    );
  end if;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.full_name), '[]'::jsonb), count(*)
  into v_items, v_count
  from (
    select
      e.id as employee_id,
      e.full_name as name,
      coalesce(e.job_title_name, '—') as job_title,
      coalesce(e.employee_number, '—') as employee_number,
      coalesce(e.department, '—') as department
    from public.employees e
    where e.company_id = public.get_my_company_id()
      and public.agent_is_active_status(e.employment_status)
      and e.full_name ilike ('%' || replace(replace(v_term, '%', ''), '_', '') || '%')
    limit 10
  ) x;

  return jsonb_build_object(
    'result_type', 'search',
    'answer_text', case when v_count = 0 then format('لم أجد موظفاً يطابق «%s».', v_term) else '' end,
    'data', jsonb_build_object('candidates', coalesce(v_items, '[]'::jsonb))
  );
end;
$$;

create or replace function public.q_employee_summary(p_employee_id bigint)
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare v_row public.employees%rowtype;
  v_lines jsonb;
begin
  select * into v_row
  from public.employees e
  where e.company_id = public.get_my_company_id()
    and e.id = p_employee_id;

  if not found then
    return jsonb_build_object(
      'result_type', 'text',
      'answer_text', 'لم أجد الموظف المطلوب.',
      'data', jsonb_build_object()
    );
  end if;

  v_lines := jsonb_build_array(
    'الاسم: ' || coalesce(v_row.full_name, 'موظف'),
    'الرقم الوظيفي: ' || coalesce(v_row.employee_number, '—'),
    'المسمى: ' || coalesce(v_row.job_title_name, '—'),
    'القسم: ' || coalesce(v_row.department, '—'),
    'الحالة: ' || coalesce(v_row.employment_status, '—'),
    'تاريخ التعيين: ' || coalesce(v_row.hire_date::text, '—'),
    'رصيد الإجازات: ' || coalesce(v_row.leave_balance, 0)::text || ' يوم',
    'المدير المباشر: ' || coalesce(v_row.direct_manager_name, '—')
  );

  if not public.agent_is_saudi(v_row.nationality) and v_row.iqama_expiry_date is not null then
    v_lines := v_lines || jsonb_build_array('انتهاء الإقامة: ' || v_row.iqama_expiry_date::text);
  end if;

  return jsonb_build_object(
    'result_type', 'profile',
    'answer_text', 'ملخص الموظف ' || coalesce(v_row.full_name, ''),
    'data', jsonb_build_object(
      'employee_id', v_row.id,
      'profile', jsonb_build_object(
        'full_name', v_row.full_name,
        'employee_number', v_row.employee_number,
        'job_title_name', v_row.job_title_name,
        'department', v_row.department,
        'employment_status', v_row.employment_status,
        'hire_date', v_row.hire_date,
        'leave_balance', v_row.leave_balance,
        'direct_manager_name', v_row.direct_manager_name,
        'iqama_expiry_date', v_row.iqama_expiry_date,
        'iqama_number', v_row.iqama_number,
        'nationality', v_row.nationality,
        'phone_number', v_row.phone_number,
        'email', v_row.email
      ),
      'lines', v_lines
    )
  );
end;
$$;

create or replace function public.q_employee_iqama(p_employee_id bigint)
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare v_row public.employees%rowtype;
begin
  select * into v_row from public.employees e
  where e.company_id = public.get_my_company_id() and e.id = p_employee_id;
  if not found then
    return jsonb_build_object('result_type', 'text', 'answer_text', 'لم أجد الموظف.', 'data', '{}'::jsonb);
  end if;
  if public.agent_is_saudi(v_row.nationality) then
    return jsonb_build_object(
      'result_type', 'text',
      'answer_text', coalesce(v_row.full_name, 'الموظف') || ' سعودي/ة — لا يوجد إقامة.',
      'data', jsonb_build_object('employee_id', v_row.id)
    );
  end if;
  return jsonb_build_object(
    'result_type', 'text',
    'answer_text', format('إقامة %s: رقم %s — تنتهي %s.',
      coalesce(v_row.full_name, 'الموظف'),
      coalesce(v_row.iqama_number, '—'),
      coalesce(v_row.iqama_expiry_date::text, '—')),
    'data', jsonb_build_object(
      'employee_id', v_row.id,
      'iqama_number', v_row.iqama_number,
      'iqama_expiry_date', v_row.iqama_expiry_date
    )
  );
end;
$$;

create or replace function public.q_employee_leave(p_employee_id bigint)
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare
  v_row public.employees%rowtype;
  v_recent jsonb;
begin
  select * into v_row from public.employees e
  where e.company_id = public.get_my_company_id() and e.id = p_employee_id;
  if not found then
    return jsonb_build_object('result_type', 'text', 'answer_text', 'لم أجد الموظف.', 'data', '{}'::jsonb);
  end if;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.start_date desc), '[]'::jsonb)
  into v_recent
  from (
    select r.leave_type, r.leave_days, r.start_date, r.status
    from public.requests r
    where r.company_id = v_row.company_id
      and r.employee_id = v_row.id
      and r.request_type = 'Leave'
    order by r.created_at desc
    limit 3
  ) x;

  return jsonb_build_object(
    'result_type', 'text',
    'answer_text', format('رصيد إجازات %s: %s يوم.', coalesce(v_row.full_name, 'الموظف'), coalesce(v_row.leave_balance, 0)),
    'data', jsonb_build_object(
      'employee_id', v_row.id,
      'leave_balance', v_row.leave_balance,
      'recent_requests', coalesce(v_recent, '[]'::jsonb)
    )
  );
end;
$$;

create or replace function public.q_employee_attendance_today(p_employee_id bigint)
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare
  v_name text;
  v_rec public.attendance_records%rowtype;
begin
  select full_name into v_name from public.employees e
  where e.company_id = public.get_my_company_id() and e.id = p_employee_id;
  if v_name is null then
    return jsonb_build_object('result_type', 'text', 'answer_text', 'لم أجد الموظف.', 'data', '{}'::jsonb);
  end if;

  select * into v_rec from public.attendance_records ar
  where ar.company_id = public.get_my_company_id()
    and ar.employee_id = p_employee_id
    and ar.record_date = current_date;

  if not found then
    return jsonb_build_object(
      'result_type', 'text',
      'answer_text', format('لا يوجد سجل حضور اليوم لـ %s.', v_name),
      'data', jsonb_build_object('employee_id', p_employee_id)
    );
  end if;

  return jsonb_build_object(
    'result_type', 'text',
    'answer_text', format('حضور %s اليوم: %s%s.',
      v_name,
      v_rec.status,
      case when coalesce(v_rec.delay_minutes, 0) > 0
        then ' — تأخير ' || v_rec.delay_minutes || ' دقيقة' else '' end),
    'data', jsonb_build_object(
      'employee_id', p_employee_id,
      'status', v_rec.status,
      'delay_minutes', v_rec.delay_minutes
    )
  );
end;
$$;

-- ─── Digest RPCs (self-contained; no agent_* helper dependencies) ───────────

create or replace function public.digest_recent_requests()
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare v_items jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  into v_items
  from (
    select
      r.id,
      coalesce(emp.full_name, 'موظف') as title,
      case r.request_type
        when 'Leave' then 'طلب إجازة'
        when 'Financial' then 'طلب مالي'
        else 'طلب عام'
      end || ' — ' || left(coalesce(r.details, ''), 40) as subtitle,
      r.status,
      r.created_at,
      (
        r.status = 'Pending'
        and (
          coalesce(public.get_my_role(), '') in (
            'owner', 'Executive', 'HR_Manager', 'HR_Assistant'
          )
          or (
            coalesce(public.get_my_role(), '') = 'Direct_Manager'
            and coalesce(r.routing_to, '') in ('Direct_Manager', '')
          )
          or (
            coalesce(public.get_my_role(), '') in ('HR_Manager', 'HR_Assistant')
            and r.routing_to = 'HR_Manager'
          )
        )
      ) as needs_approval
    from public.requests r
    left join public.employees emp on emp.id = r.employee_id
    where r.company_id = public.get_my_company_id()
    order by r.created_at desc
    limit 5
  ) x;

  return jsonb_build_object('items', coalesce(v_items, '[]'::jsonb));
end;
$$;

create or replace function public.digest_recent_joiners()
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare v_items jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  into v_items
  from (
    select
      e.id,
      e.full_name as title,
      coalesce(e.job_title_name, '—') || ' · ' || coalesce(e.department, '—') as subtitle,
      e.hire_date,
      e.created_at
    from public.employees e
    where e.company_id = public.get_my_company_id()
      and coalesce(trim(e.employment_status), '') not in ('منتهي الخدمة', 'موقوف')
    order by coalesce(e.hire_date, e.created_at::date) desc nulls last
    limit 5
  ) x;

  return jsonb_build_object('items', coalesce(v_items, '[]'::jsonb));
end;
$$;

create or replace function public.digest_recent_renewals()
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare v_items jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  into v_items
  from (
    select
      e.id,
      e.full_name as title,
      case
        when e.contract_expiry is not null
          then 'تحديث عقد — ينتهي ' || e.contract_expiry::text
        when e.hire_date is not null
          then 'تحديث — ذكرى التعيين ' || e.hire_date::text
        else 'تحديث بيانات'
      end as subtitle,
      e.updated_at
    from public.employees e
    where e.company_id = public.get_my_company_id()
      and e.updated_at >= now() - interval '60 days'
      and e.updated_at > e.created_at + interval '1 day'
      and (e.contract_expiry is not null or e.hire_date is not null)
    order by e.updated_at desc
    limit 5
  ) x;

  return jsonb_build_object('items', coalesce(v_items, '[]'::jsonb));
end;
$$;

create or replace function public.digest_recent_admin_actions()
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare v_items jsonb;
begin
  v_items := '[]'::jsonb;

  if to_regclass('public.administrative_actions') is not null then
    execute $sql$
      select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
      from (
        select
          a.id,
          coalesce(emp.full_name, 'موظف') as title,
          coalesce(a.action_type, 'إجراء') || ' — ' || left(coalesce(a.reason, ''), 40) as subtitle,
          a.created_at
        from public.administrative_actions a
        left join public.employees emp on emp.id = a.employee_id
        where a.company_id = public.get_my_company_id()
        order by a.created_at desc
        limit 5
      ) x
    $sql$ into v_items;
  end if;

  if jsonb_array_length(coalesce(v_items, '[]'::jsonb)) = 0 then
    select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    into v_items
    from (
      select
        e.id,
        e.full_name as title,
        'تحديث: ' || coalesce(e.job_title_name, '—') || ' · ' || coalesce(e.department, '—') as subtitle,
        e.updated_at as created_at
      from public.employees e
      where e.company_id = public.get_my_company_id()
        and e.updated_at >= now() - interval '30 days'
        and e.updated_at > e.created_at + interval '1 day'
      order by e.updated_at desc
      limit 5
    ) x;
  end if;

  return jsonb_build_object('items', coalesce(v_items, '[]'::jsonb));
end;
$$;

-- ─── Grants ─────────────────────────────────────────────────────────────────

grant execute on function public.q_active_employees_count() to authenticated;
grant execute on function public.q_attendance_today() to authenticated;
grant execute on function public.q_iqamas_expiring(integer) to authenticated;
grant execute on function public.q_contracts_expiring(integer) to authenticated;
grant execute on function public.q_employees_without_annual_leave() to authenticated;
grant execute on function public.q_pending_approvals() to authenticated;
grant execute on function public.q_employee_search(text) to authenticated;
grant execute on function public.q_employee_summary(bigint) to authenticated;
grant execute on function public.q_employee_iqama(bigint) to authenticated;
grant execute on function public.q_employee_leave(bigint) to authenticated;
grant execute on function public.q_employee_attendance_today(bigint) to authenticated;
grant execute on function public.digest_recent_requests() to authenticated;
grant execute on function public.digest_recent_joiners() to authenticated;
grant execute on function public.digest_recent_renewals() to authenticated;
grant execute on function public.digest_recent_admin_actions() to authenticated;

notify pgrst, 'reload schema';
