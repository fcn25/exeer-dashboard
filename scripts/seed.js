#!/usr/bin/env node
/**
 * Applies supabase/seed.sql to the project database.
 *
 * Preferred: set DATABASE_URL (or SUPABASE_DB_URL) to the Postgres connection string
 * from Supabase Dashboard → Project Settings → Database.
 *
 * Fallback (no direct DB URL): set SUPABASE_URL (or VITE_SUPABASE_URL) and
 * SUPABASE_SERVICE_ROLE_KEY — seed rows are upserted via the REST API (same data as seed.sql).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = join(__dirname, "..", "supabase", "seed.sql");

const DEPARTMENTS = [
  "الإدارة العامة",
  "الموارد البشرية",
  "المالية والمحاسبة",
  "المبيعات والتسويق",
  "تقنية المعلومات",
  "العمليات والإنتاج",
  "خدمة العملاء",
  "المشتريات والمستودعات",
  "الشؤون القانونية",
  "التطوير والابتكار",
];

const JOB_TITLES = [
  "مدير عام",
  "مدير إدارة",
  "مشرف",
  "محاسب",
  "مهندس",
  "مطور برمجيات",
  "أخصائي موارد بشرية",
  "مندوب مبيعات",
  "محلل بيانات",
  "مسؤول خدمة عملاء",
  "سكرتير تنفيذي",
  "موظف إداري",
  "سائق",
  "أمن وحراسة",
  "عامل",
];

const LEAVE_TYPES = [
  { name: "إجازة سنوية", default_days: 21 },
  { name: "إجازة مرضية", default_days: 30 },
  { name: "إجازة أمومة", default_days: 70 },
  { name: "إجازة أبوة", default_days: 3 },
  { name: "إجازة الزواج", default_days: 5 },
  { name: "إجازة الوفاة", default_days: 5 },
  { name: "إجازة الحج", default_days: 10 },
  { name: "إجازة بدون راتب", default_days: 0 },
];

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function runWithPg(sql) {
  const dbUrl = process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
  if (!dbUrl) return false;

  let pg;
  try {
    pg = await import("pg");
  } catch {
    throw new Error(
      "DATABASE_URL is set but the pg package is not installed. Run: npm install pg",
    );
  }

  const client = new pg.default.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
  return true;
}

async function runWithServiceRole() {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim();
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url) {
    throw new Error(
      "Missing SUPABASE_URL or VITE_SUPABASE_URL (required when DATABASE_URL is not set).",
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: deptError } = await supabase
    .from("departments")
    .upsert(DEPARTMENTS.map((name) => ({ name })), {
      onConflict: "name",
      ignoreDuplicates: true,
    });
  if (deptError) throw deptError;

  const { error: titleError } = await supabase
    .from("job_titles")
    .upsert(JOB_TITLES.map((name) => ({ name })), {
      onConflict: "name",
      ignoreDuplicates: true,
    });
  if (titleError) throw titleError;

  const { error: leaveError } = await supabase.from("leave_types").upsert(LEAVE_TYPES, {
    onConflict: "name",
    ignoreDuplicates: true,
  });
  if (leaveError) throw leaveError;

  return true;
}

async function main() {
  const sql = readFileSync(SEED_PATH, "utf8");

  if (await runWithPg(sql)) {
    console.log("Seed applied via DATABASE_URL (supabase/seed.sql).");
    return;
  }

  await runWithServiceRole();
  console.log(
    "Seed applied via Supabase REST API (service role). For full seed.sql replay, set DATABASE_URL.",
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
