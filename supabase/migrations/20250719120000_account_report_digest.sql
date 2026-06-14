-- Account report digest: payroll runs + task summary (manager dashboard panel).

create or replace function public.digest_recent_payroll_runs()
returns jsonb
language plpgsql stable security invoker set search_path = public
as $q$
declare v_items jsonb;
begin
  if to_regclass('public.payroll_runs') is null then
    return jsonb_build_object('items', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.event_at desc), '[]'::jsonb)
  into v_items
  from (
    select
      pr.id,
      'مسير ' || coalesce(pr.payroll_month, '—') as title,
      case lower(trim(coalesce(pr.status, 'draft')))
        when 'locked' then
          'إقفال المسير'
          || case when pr.locked_at is not null
            then ' · ' || to_char(pr.locked_at, 'YYYY-MM-DD')
            else '' end
        when 'pending_approval' then 'بانتظار اعتماد الموارد البشرية'
        when 'under_review' then 'قيد مراجعة المحاسب'
        when 'cancelled' then 'مسير ملغى'
        else
          'إنشاء/تحديث مسودة'
          || case when pr.updated_at is not null
            then ' · ' || to_char(pr.updated_at, 'YYYY-MM-DD')
            else '' end
      end as subtitle,
      lower(trim(coalesce(pr.status, 'draft'))) as run_status,
      coalesce(pr.locked_at, pr.updated_at, pr.created_at) as event_at
    from public.payroll_runs pr
    where pr.company_id = public.get_my_company_id()
    order by coalesce(pr.locked_at, pr.updated_at, pr.created_at) desc nulls last
    limit 5
  ) x;

  return jsonb_build_object('items', coalesce(v_items, '[]'::jsonb));
end;
$q$;

create or replace function public.digest_recent_tasks()
returns jsonb
language plpgsql stable security invoker set search_path = public
as $q$
declare v_items jsonb;
begin
  if to_regclass('public.tasks') is null then
    return jsonb_build_object('items', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.sort_key, x.deadline nulls last), '[]'::jsonb)
  into v_items
  from (
    select
      t.id,
      coalesce(nullif(trim(t.title), ''), left(coalesce(t.description, 'مهمة'), 60)) as title,
      coalesce(nullif(trim(t.assigned_to_name), ''), '—')
        || ' · '
        || case
          when t.deadline is not null
            and t.deadline < current_date
            and lower(trim(coalesce(t.status, ''))) not in ('مكتملة', 'done', 'completed', 'complete')
          then 'متأخرة · موعد ' || t.deadline::text
          when lower(trim(coalesce(t.status, ''))) in ('قيد التنفيذ', 'in progress', 'in_progress', 'progress')
          then 'قيد التنفيذ'
            || case when t.deadline is not null then ' · موعد ' || t.deadline::text else '' end
          else coalesce(nullif(trim(t.status), ''), 'قيد الانتظار')
        end as subtitle,
      (
        t.deadline is not null
        and t.deadline < current_date
        and lower(trim(coalesce(t.status, ''))) not in ('مكتملة', 'done', 'completed', 'complete')
      ) as is_overdue,
      (
        lower(trim(coalesce(t.status, ''))) in ('قيد التنفيذ', 'in progress', 'in_progress', 'progress')
      ) as is_in_progress,
      case
        when t.deadline is not null
          and t.deadline < current_date
          and lower(trim(coalesce(t.status, ''))) not in ('مكتملة', 'done', 'completed', 'complete')
        then 0
        else 1
      end as sort_key,
      t.deadline
    from public.tasks t
    where t.company_id = public.get_my_company_id()
      and lower(trim(coalesce(t.status, ''))) not in ('مكتملة', 'done', 'completed', 'complete')
      and (
        (
          t.deadline is not null
          and t.deadline < current_date
        )
        or lower(trim(coalesce(t.status, ''))) in ('قيد التنفيذ', 'in progress', 'in_progress', 'progress')
      )
    order by sort_key, t.deadline asc nulls last, t.updated_at desc nulls last
    limit 5
  ) x;

  return jsonb_build_object('items', coalesce(v_items, '[]'::jsonb));
end;
$q$;

grant execute on function public.digest_recent_payroll_runs() to authenticated;
grant execute on function public.digest_recent_tasks() to authenticated;

notify pgrst, 'reload schema';
