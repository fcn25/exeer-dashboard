-- SaaS subscription tier (seat limits); plan_status remains trial/active/expired

alter table public.companies
  add column if not exists subscription_tier text not null default 'trial';

alter table public.companies
  drop constraint if exists companies_subscription_tier_check;

alter table public.companies
  add constraint companies_subscription_tier_check
  check (subscription_tier in ('trial', 'startup', 'growth'));

update public.companies
set subscription_tier = coalesce(nullif(trim(subscription_tier), ''), 'trial')
where subscription_tier is null;
