#!/usr/bin/env node
/**
 * Applies supabase/migrations/20250721120000_task_activity.sql to Postgres,
 * then verifies public.task_activity exists and notifies PostgREST.
 *
 *   export DATABASE_URL='postgresql://postgres:...@db....supabase.co:5432/postgres'
 *   npm run db:apply-task-activity
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
  "20250721120000_task_activity.sql",
);
const BUCKET_MIGRATION_PATH = join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20250721130000_task_attachments_1mb_limit.sql",
);

const VERIFY_TABLE_SQL = `
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'task_activity';
`;

const VERIFY_BUCKET_SQL = `
select id, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'task-attachments';
`;

async function main() {
  const dbUrl =
    process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
  if (!dbUrl) {
    throw new Error(
      "Set DATABASE_URL to your Supabase Postgres connection string, then re-run:\n  npm run db:apply-task-activity",
    );
  }

  const pg = await import("pg");
  const sql = readFileSync(MIGRATION_PATH, "utf8");
  const bucketSql = readFileSync(BUCKET_MIGRATION_PATH, "utf8");
  const client = new pg.default.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    const existing = await client.query(VERIFY_TABLE_SQL);
    if (existing.rows.length > 0) {
      console.log("public.task_activity already exists — applying bucket limit patch only.");
      await client.query(bucketSql);
    } else {
      console.log("Applying task_activity migration…");
      await client.query(sql);
      await client.query(bucketSql);
    }

    const { rows: tableRows } = await client.query(VERIFY_TABLE_SQL);
    if (tableRows.length === 0) {
      throw new Error(
        "Migration finished but public.task_activity was not found. Check SQL errors above.",
      );
    }
    console.log("Verified: public.task_activity exists.");

    const { rows: bucketRows } = await client.query(VERIFY_BUCKET_SQL);
    const bucket = bucketRows[0];
    if (!bucket) {
      console.warn("WARN: task-attachments bucket not found.");
    } else {
      console.log(
        `Verified: task-attachments limit=${bucket.file_size_limit} bytes, mime=${JSON.stringify(bucket.allowed_mime_types)}`,
      );
      if (Number(bucket.file_size_limit) !== 1048576) {
        console.warn("WARN: bucket file_size_limit is not 1 MB.");
        process.exitCode = 1;
      }
    }

    await client.query("notify pgrst, 'reload schema';");
    console.log("Done. PostgREST schema reload notified.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
