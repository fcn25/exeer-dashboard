-- Company branch geofencing (attendance punch zones)
--
-- POSTGIS PREP (required before employee punch distance checks):
--   1. In Supabase Dashboard → Database → Extensions → enable "postgis"
--   2. Future punch validation will use ST_DistanceSphere, e.g.:
--        ST_DistanceSphere(
--          ST_MakePoint(branch.longitude, branch.latitude)::geography,
--          ST_MakePoint(punch_longitude, punch_latitude)::geography
--        ) <= branch.radius_meters
--   3. Optionally add a generated geography column after PostGIS is enabled:
--        ALTER TABLE public.company_branches
--          ADD COLUMN location geography(POINT, 4326)
--          GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED;

create table if not exists public.company_branches (
  id uuid primary key default gen_random_uuid(),
  company_id bigint not null references public.companies (id) on delete cascade,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters integer not null default 150 check (radius_meters > 0 and radius_meters <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_branches_company_name_unique unique (company_id, name)
);

create index if not exists company_branches_company_id_idx
  on public.company_branches (company_id);

create or replace function public.set_company_branches_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists company_branches_updated_at on public.company_branches;

create trigger company_branches_updated_at
  before update on public.company_branches
  for each row
  execute function public.set_company_branches_updated_at();

alter table public.company_branches enable row level security;

drop policy if exists company_branches_select_company on public.company_branches;
drop policy if exists company_branches_modify_hr on public.company_branches;

create policy company_branches_select_company
  on public.company_branches for select to authenticated
  using (company_id = public.get_my_company_id());

create policy company_branches_modify_hr
  on public.company_branches for all to authenticated
  using (
    company_id = public.get_my_company_id()
    and (
      public.is_company_owner()
      or public.is_hr_staff()
      or public.is_company_manager()
    )
  )
  with check (
    company_id = public.get_my_company_id()
    and (
      public.is_company_owner()
      or public.is_hr_staff()
      or public.is_company_manager()
    )
  );

comment on table public.company_branches is
  'Branch geofence centers for attendance punch validation. Enable PostGIS before ST_DistanceSphere checks.';

comment on column public.company_branches.radius_meters is
  'Allowed attendance radius in meters around latitude/longitude (validated via PostGIS ST_DistanceSphere).';
