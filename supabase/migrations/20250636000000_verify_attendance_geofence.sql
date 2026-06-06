-- PostGIS geofence validation for employee attendance punch

create extension if not exists postgis;

create or replace function public.verify_attendance_geofence(
  emp_user_id uuid,
  current_lat double precision,
  current_lng double precision
)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_work_location_id uuid;
  v_branch_lat double precision;
  v_branch_lng double precision;
  v_radius_meters double precision;
  v_distance double precision;
begin
  if emp_user_id is distinct from auth.uid() then
    raise exception 'unauthorized geofence verification';
  end if;

  select e.work_location_id
  into v_work_location_id
  from public.employees e
  inner join auth.users u on u.id = emp_user_id
  where lower(trim(coalesce(e.email, ''))) = lower(trim(coalesce(u.email, '')))
  limit 1;

  if v_work_location_id is null then
    return json_build_object(
      'is_within_radius', false,
      'distance_meters', null
    );
  end if;

  select b.latitude, b.longitude, b.radius_meters
  into v_branch_lat, v_branch_lng, v_radius_meters
  from public.company_branches b
  where b.id = v_work_location_id
  limit 1;

  if v_branch_lat is null or v_branch_lng is null or v_radius_meters is null then
    return json_build_object(
      'is_within_radius', false,
      'distance_meters', null
    );
  end if;

  v_distance := st_distancesphere(
    st_makepoint(current_lng, current_lat),
    st_makepoint(v_branch_lng, v_branch_lat)
  );

  return json_build_object(
    'is_within_radius', v_distance <= v_radius_meters,
    'distance_meters', v_distance
  );
end;
$$;

grant execute on function public.verify_attendance_geofence(
  uuid,
  double precision,
  double precision
) to authenticated;

comment on function public.verify_attendance_geofence(uuid, double precision, double precision) is
  'Validates employee GPS against assigned branch geofence via ST_DistanceSphere.';
