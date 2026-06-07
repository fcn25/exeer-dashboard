-- Calendar appointments: private per authenticated user within company

drop policy if exists calendar_appointments_company_all on public.calendar_appointments;

drop policy if exists calendar_appointments_select_own on public.calendar_appointments;
drop policy if exists calendar_appointments_insert_own on public.calendar_appointments;
drop policy if exists calendar_appointments_update_own on public.calendar_appointments;
drop policy if exists calendar_appointments_delete_own on public.calendar_appointments;

create policy calendar_appointments_select_own
  on public.calendar_appointments for select to authenticated
  using (
    company_id = public.get_my_company_id()
    and created_by = auth.uid()
  );

create policy calendar_appointments_insert_own
  on public.calendar_appointments for insert to authenticated
  with check (
    company_id = public.get_my_company_id()
    and created_by = auth.uid()
  );

create policy calendar_appointments_update_own
  on public.calendar_appointments for update to authenticated
  using (
    company_id = public.get_my_company_id()
    and created_by = auth.uid()
  )
  with check (
    company_id = public.get_my_company_id()
    and created_by = auth.uid()
  );

create policy calendar_appointments_delete_own
  on public.calendar_appointments for delete to authenticated
  using (
    company_id = public.get_my_company_id()
    and created_by = auth.uid()
  );

create index if not exists calendar_appointments_user_date_idx
  on public.calendar_appointments (company_id, created_by, appointment_date);
