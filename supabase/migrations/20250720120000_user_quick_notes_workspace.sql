-- Evolve user_quick_notes: multiple workspace notes (title, links) + role-aware RLS.

alter table public.user_quick_notes
  drop constraint if exists user_quick_notes_employee_unique;

alter table public.user_quick_notes
  add column if not exists title text,
  add column if not exists related_employee_id bigint references public.employees (id) on delete set null,
  add column if not exists related_department text;

create index if not exists user_quick_notes_company_updated_idx
  on public.user_quick_notes (company_id, updated_at desc);

create index if not exists user_quick_notes_related_employee_idx
  on public.user_quick_notes (related_employee_id)
  where related_employee_id is not null;

drop policy if exists user_quick_notes_select_own on public.user_quick_notes;
drop policy if exists user_quick_notes_insert_own on public.user_quick_notes;
drop policy if exists user_quick_notes_update_own on public.user_quick_notes;
drop policy if exists user_quick_notes_delete_own on public.user_quick_notes;

create policy user_quick_notes_select
  on public.user_quick_notes for select to authenticated
  using (
    company_id = public.get_my_company_id()
    and (
      employee_id = public.get_my_employee_id()
      or coalesce(public.get_my_role(), '') in (
        'owner', 'Executive', 'HR_Manager', 'HR_Assistant'
      )
      or (
        coalesce(public.get_my_role(), '') = 'Direct_Manager'
        and (
          employee_id = any(public.agent_get_team_employee_ids())
          or related_employee_id = any(public.agent_get_team_employee_ids())
        )
      )
    )
  );

create policy user_quick_notes_insert
  on public.user_quick_notes for insert to authenticated
  with check (
    company_id = public.get_my_company_id()
    and employee_id = public.get_my_employee_id()
  );

create policy user_quick_notes_update
  on public.user_quick_notes for update to authenticated
  using (
    company_id = public.get_my_company_id()
    and employee_id = public.get_my_employee_id()
  )
  with check (
    company_id = public.get_my_company_id()
    and employee_id = public.get_my_employee_id()
  );

create policy user_quick_notes_delete
  on public.user_quick_notes for delete to authenticated
  using (
    company_id = public.get_my_company_id()
    and employee_id = public.get_my_employee_id()
  );

notify pgrst, 'reload schema';
