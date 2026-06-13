-- Run alone in Supabase SQL Editor, then verify:
-- select proname from pg_proc where proname = 'digest_recent_requests';

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

grant execute on function public.digest_recent_requests() to authenticated;
