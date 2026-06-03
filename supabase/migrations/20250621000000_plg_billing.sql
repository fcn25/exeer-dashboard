-- PLG billing: trial tracking + single-use promo codes

alter table public.companies
  add column if not exists plan_status text not null default 'trial',
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '14 days');

alter table public.companies
  drop constraint if exists companies_plan_status_check;

alter table public.companies
  add constraint companies_plan_status_check
  check (plan_status in ('trial', 'active', 'expired', 'cancelled'));

update public.companies
set
  plan_status = coalesce(nullif(trim(plan_status), ''), 'trial'),
  trial_ends_at = coalesce(trial_ends_at, created_at + interval '14 days')
where trial_ends_at is null or plan_status is null;

create table if not exists public.promo_codes (
  code text primary key,
  bonus_days integer not null check (bonus_days > 0),
  is_used boolean not null default false,
  used_at timestamptz,
  used_by_company_id bigint references public.companies (id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.promo_codes (code, bonus_days, is_used)
values
  ('EXEER-VIP-1', 60, false),
  ('EXEER-VIP-2', 60, false),
  ('EXEER-VIP-3', 60, false),
  ('EXEER-VIP-4', 60, false),
  ('EXEER-VIP-5', 60, false)
on conflict (code) do nothing;

alter table public.promo_codes enable row level security;

-- Promo codes are redeemed only via RPC (not readable directly by clients)
drop policy if exists promo_codes_no_client on public.promo_codes;

create policy promo_codes_no_client
  on public.promo_codes for all to authenticated
  using (false)
  with check (false);

revoke all on public.promo_codes from anon;
grant select, update on public.promo_codes to service_role;

create or replace function public.apply_promo_code(p_code text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized text;
  v_bonus integer;
  v_company_id bigint;
  v_current_end timestamptz;
  v_new_end timestamptz;
begin
  v_normalized := upper(trim(coalesce(p_code, '')));
  if v_normalized = '' then
    raise exception 'promo_code_required';
  end if;

  v_company_id := public.get_my_company_id();
  if v_company_id is null then
    raise exception 'company_not_found';
  end if;

  if not public.is_company_owner() then
    raise exception 'owner_required';
  end if;

  select bonus_days
  into v_bonus
  from public.promo_codes
  where code = v_normalized and is_used = false
  for update;

  if not found then
    raise exception 'invalid_promo_code';
  end if;

  select trial_ends_at
  into v_current_end
  from public.companies
  where id = v_company_id
  for update;

  v_new_end := greatest(coalesce(v_current_end, now()), now()) + make_interval(days => v_bonus);

  update public.companies
  set trial_ends_at = v_new_end,
      plan_status = 'trial'
  where id = v_company_id;

  update public.promo_codes
  set
    is_used = true,
    used_at = now(),
    used_by_company_id = v_company_id
  where code = v_normalized;

  return v_new_end;
end;
$$;

grant execute on function public.apply_promo_code(text) to authenticated;
