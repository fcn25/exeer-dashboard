-- Restrict branch geofence definition to company owner only.

drop policy if exists company_branches_modify_hr on public.company_branches;

drop policy if exists company_branches_modify_owner on public.company_branches;

create policy company_branches_modify_owner
  on public.company_branches for all to authenticated
  using (
    company_id = public.get_my_company_id()
    and public.is_company_owner()
  )
  with check (
    company_id = public.get_my_company_id()
    and public.is_company_owner()
  );
