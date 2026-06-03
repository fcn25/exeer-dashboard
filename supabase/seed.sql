-- Default HR reference data (safe to re-run)
-- Requires: supabase/migrations/20250617000000_hr_reference_tables.sql

insert into public.departments (name) values
  ('الإدارة العامة'),
  ('الموارد البشرية'),
  ('المالية والمحاسبة'),
  ('المبيعات والتسويق'),
  ('تقنية المعلومات'),
  ('العمليات والإنتاج'),
  ('خدمة العملاء'),
  ('المشتريات والمستودعات'),
  ('الشؤون القانونية'),
  ('التطوير والابتكار')
on conflict (name) do nothing;

insert into public.job_titles (name) values
  ('مدير عام'),
  ('مدير إدارة'),
  ('مشرف'),
  ('محاسب'),
  ('مهندس'),
  ('مطور برمجيات'),
  ('أخصائي موارد بشرية'),
  ('مندوب مبيعات'),
  ('محلل بيانات'),
  ('مسؤول خدمة عملاء'),
  ('سكرتير تنفيذي'),
  ('موظف إداري'),
  ('سائق'),
  ('أمن وحراسة'),
  ('عامل')
on conflict (name) do nothing;

insert into public.leave_types (name, default_days) values
  ('إجازة سنوية', 21),
  ('إجازة مرضية', 30),
  ('إجازة أمومة', 70),
  ('إجازة أبوة', 3),
  ('إجازة الزواج', 5),
  ('إجازة الوفاة', 5),
  ('إجازة الحج', 10),
  ('إجازة بدون راتب', 0)
on conflict (name) do nothing;
