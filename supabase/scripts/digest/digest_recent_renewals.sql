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

grant execute on function public.digest_recent_renewals() to authenticated;
