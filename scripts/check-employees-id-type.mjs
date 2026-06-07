#!/usr/bin/env node
/**
 * Prints employees.id column type from the live Supabase/Postgres database.
 *
 * Set one of:
 *   DATABASE_URL or SUPABASE_DB_URL — direct Postgres (preferred)
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY — uses a one-off SQL function if present
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional file
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");
loadEnvFile(".env.production");

const SQL = `
  SELECT column_name, data_type, udt_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'employees'
    AND column_name = 'id';
`;

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (dbUrl) {
  const pg = await import("pg");
  const client = new pg.default.Client({ connectionString: dbUrl });
  await client.connect();
  const { rows } = await client.query(SQL);
  console.log(JSON.stringify(rows[0] ?? null, null, 2));
  await client.end();
  process.exit(rows[0] ? 0 : 1);
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing credentials. Set DATABASE_URL or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: sample, error: sampleError } = await supabase
  .from("employees")
  .select("id")
  .limit(1)
  .maybeSingle();

if (sampleError) {
  console.error(sampleError.message);
  process.exit(1);
}

if (!sample?.id) {
  console.error("employees table is empty — cannot infer id type from sample.");
  process.exit(1);
}

const id = sample.id;
const inferred =
  typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) ? "uuid" : "bigint";

console.log(
  JSON.stringify(
    {
      column_name: "id",
      data_type: inferred,
      udt_name: inferred,
      source: "inferred_from_sample",
      sample: id,
    },
    null,
    2,
  ),
);
