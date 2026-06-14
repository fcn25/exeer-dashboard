-- Standalone digest RPCs for Query Panel (zero parameters).
-- Safe to re-run: CREATE OR REPLACE + notify PostgREST schema reload.

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
      'تجديد العقد — '
        || renewal.renewal_date::text
        || ' (بعد '
        || (renewal.renewal_date - current_date)::int
        || ' يوم)' as subtitle,
      renewal.renewal_date,
      (renewal.renewal_date - current_date) as days_remaining
    from public.employees e
    cross join lateral (
      select (
        e.hire_date + (
          (
            extract(year from current_date)::int
            - extract(year from e.hire_date)::int
            + case
                when to_char(e.hire_date, 'MMDD') <= to_char(current_date, 'MMDD')
                then 1
                else 0
              end
          ) || ' years'
        )::interval
      )::date as renewal_date
    ) renewal
    where e.company_id = public.get_my_company_id()
      and e.hire_date is not null
      and coalesce(trim(e.employment_status), '') not in ('منتهي الخدمة', 'موقوف')
      and renewal.renewal_date >= current_date
      and renewal.renewal_date <= current_date + interval '3 months'
    order by renewal.renewal_date asc
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

grant execute on function public.digest_recent_requests() to authenticated;
grant execute on function public.digest_recent_joiners() to authenticated;
grant execute on function public.digest_recent_renewals() to authenticated;
grant execute on function public.digest_recent_admin_actions() to authenticated;

notify pgrst, 'reload schema';
