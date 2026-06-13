#!/usr/bin/env node
/**
 * Applies supabase/migrations/20250713140000_agent_query_rpcs.sql to Postgres.
 *
 * Set DATABASE_URL (Supabase Dashboard → Project Settings → Database → connection string).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20250713140000_agent_query_rpcs.sql",
);

const VERIFY_SQL = `
select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'digest_recent_requests',
    'digest_recent_joiners',
    'digest_recent_renewals',
    'digest_recent_admin_actions'
  )
order by proname;
`;

async function main() {
  const dbUrl =
    process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
  if (!dbUrl) {
    throw new Error(
      "Set DATABASE_URL to your Supabase Postgres connection string, then re-run:\n  node scripts/apply-agent-query-migration.mjs",
    );
  }

  const pg = await import("pg");
  const sql = readFileSync(MIGRATION_PATH, "utf8");
  const client = new pg.default.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    console.log("Applying agent query migration…");
    await client.query(sql);
    const { rows } = await client.query(VERIFY_SQL);
    console.log("Digest functions in pg_proc:", rows.map((row) => row.proname).join(", ") || "(none)");
    if (rows.length !== 4) {
      throw new Error(`Expected 4 digest functions, found ${rows.length}.`);
    }
    console.log("Done. PostgREST schema reload notified.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
