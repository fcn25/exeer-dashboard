-- Allow employees to read their own attendance; managers/HR read company attendance.

drop policy if exists attendance_records_select_own on public.attendance_records;
drop policy if exists attendance_records_select_managers on public.attendance_records;

create policy attendance_records_select_own
  on public.attendance_records for select to authenticated
  using (
    company_id = public.get_my_company_id()
    and employee_id = public.get_my_employee_id()
  );

create policy attendance_records_select_managers
  on public.attendance_records for select to authenticated
  using (
    company_id = public.get_my_company_id()
    and (public.is_company_manager() or public.is_hr_staff())
  );
