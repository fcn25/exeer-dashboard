-- Distinguish manual events (Events page) from system-generated calendar entries.

alter table public.events
  add column if not exists source text not null default 'manual';

alter table public.events
  drop constraint if exists events_source_check;

alter table public.events
  add constraint events_source_check check (source in ('manual', 'system'));

create index if not exists events_company_source_datetime_idx
  on public.events (company_id, source, event_datetime);

-- Backfill approval-driven rows inserted before this migration.
update public.events
set source = 'system'
where source = 'manual'
  and (
    name like 'سلفة معتمدة:%'
    or name like 'إجازة معتمدة:%'
    or name like 'طلب معتمد:%'
  );

comment on column public.events.source is
  'manual = created via Events UI; system = auto-inserted (loan/leave approvals, etc.).';

notify pgrst, 'reload schema';
