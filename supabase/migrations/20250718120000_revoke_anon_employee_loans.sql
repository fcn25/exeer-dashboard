-- Close anon exposure introduced by 20250707120000 (RLS still applies; remove table grants).

revoke all on table public.employee_loans from anon;

notify pgrst, 'reload schema';
