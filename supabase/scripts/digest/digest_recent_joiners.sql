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

grant execute on function public.digest_recent_joiners() to authenticated;
