# Digest RPC functions — apply one at a time

Run each `.sql` file **separately** in Supabase SQL Editor (not as one transaction).

After all four succeed:

```sql
select proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and proname like 'digest_%'
order by proname;

notify pgrst, 'reload schema';
```

Or use the introspection script (recommended):

```bash
export DATABASE_URL='postgresql://postgres:...@db....supabase.co:5432/postgres'
npm run db:apply-digest
```

Files:
1. `digest_recent_requests.sql`
2. `digest_recent_joiners.sql`
3. `digest_recent_renewals.sql`
4. `digest_recent_admin_actions.sql`
