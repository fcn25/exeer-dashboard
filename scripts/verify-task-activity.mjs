#!/usr/bin/env node
/**
 * Post-apply verification for task_activity migration.
 * Uses Supabase REST (service role) + linked DB queries when available.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadEnvFile(name) {
  try {
    const raw = readFileSync(join(ROOT, name), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvFile(".env");
loadEnvFile(".env.production");

const supabaseUrl =
  process.env.VITE_SUPABASE_URL?.trim() ||
  process.env.SUPABASE_URL?.trim();
const serviceKey =
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

function runLinkedQuery(sql) {
  const escaped = sql.replace(/"/g, '\\"');
  const out = execSync(
    `npx supabase db query --linked --output json "${escaped.replace(/\n/g, " ")}"`,
    { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
  return out.trim();
}

async function main() {
  console.log("=== task_activity verification ===\n");

  // 1) information_schema + RLS via linked SQL
  console.log("1) Database checks (linked SQL):");
  try {
    const tableCheck = runLinkedQuery(
      "select table_name from information_schema.tables where table_schema='public' and table_name='task_activity'",
    );
    console.log("   information_schema.tables:", tableCheck);

    const rlsCheck = runLinkedQuery(
      "select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'task_activity'",
    );
    console.log("   pg_class RLS:", rlsCheck);

    const policiesCheck = runLinkedQuery(
      "select polname from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname='public' and c.relname='task_activity' order by polname",
    );
    console.log("   policies:", policiesCheck);

    const enumCheck = runLinkedQuery(
      "select typname from pg_type where typname = 'task_activity_kind'",
    );
    console.log("   enum task_activity_kind:", enumCheck);

    const fkCheck = runLinkedQuery(
      "select conname, confrelid::regclass as references_table from pg_constraint where conrelid = 'public.task_activity'::regclass and contype = 'f' order by conname",
    );
    console.log("   foreign keys:", fkCheck);

    console.log("\n2) NOTIFY pgrst:");
    runLinkedQuery("NOTIFY pgrst, 'reload schema'");
    console.log("   NOTIFY pgrst, 'reload schema' — OK");
  } catch (err) {
    console.error("\nSTOP: linked SQL verification failed.");
    console.error(err.stderr?.toString() || err.stdout?.toString() || err.message || err);
    process.exit(1);
  }

  // 3) Supabase client select
  console.log("\n3) Supabase client select (service role):");
  if (!supabaseUrl || !serviceKey) {
    console.error("STOP: missing VITE_SUPABASE_URL or service role key in .env");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error, count } = await supabase
    .from("task_activity")
    .select("id, task_id, kind, created_at", { count: "exact", head: false })
    .limit(5);

  if (error) {
    console.error("STOP: Supabase client select failed.");
    console.error(JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log(`   select succeeded — rows returned: ${data?.length ?? 0}, total count: ${count ?? "n/a"}`);
  if (data?.length) {
    console.log("   sample:", JSON.stringify(data[0]));
  } else {
    console.log("   (table empty — expected for new migration)");
  }

  console.log("\n=== All verification steps passed ===");
}

main().catch((err) => {
  console.error("STOP:", err.message || err);
  process.exit(1);
});
