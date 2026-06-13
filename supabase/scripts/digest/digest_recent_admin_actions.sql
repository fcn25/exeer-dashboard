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

grant execute on function public.digest_recent_admin_actions() to authenticated;
