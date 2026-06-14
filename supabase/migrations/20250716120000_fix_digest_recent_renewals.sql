-- Fix digest_recent_renewals: use hire_date (+ 1 year cycles), not contract_expiry.

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

grant execute on function public.digest_recent_renewals() to authenticated;

notify pgrst, 'reload schema';
