import { existsSync } from "node:fs";
import { loadEnv } from "vite";

const mode = process.env.NODE_ENV === "development" ? "development" : "production";
const env = loadEnv(mode, process.cwd(), "");

const supabaseUrl = String(env.VITE_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = String(env.VITE_SUPABASE_ANON_KEY ?? "").trim();
const geminiApiKey = String(env.VITE_GEMINI_API_KEY ?? "").trim();

const PLACEHOLDER_PATTERNS = [
  "your-project",
  "your-publishable",
  "your-anon",
  "your-gemini",
];

function looksLikePlaceholder(value) {
  if (!value) return true;
  const lower = value.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((token) => lower.includes(token));
}

const errors = [];

if (!supabaseUrl || looksLikePlaceholder(supabaseUrl)) {
  errors.push("VITE_SUPABASE_URL is missing or still uses a placeholder value.");
}

if (!supabaseAnonKey || looksLikePlaceholder(supabaseAnonKey)) {
  errors.push(
    "VITE_SUPABASE_ANON_KEY is missing or still uses a placeholder value.",
  );
}

if (!geminiApiKey || looksLikePlaceholder(geminiApiKey)) {
  errors.push(
    "VITE_GEMINI_API_KEY is missing or still uses a placeholder value. Add it to .env (dev) and .env.production (build/deploy).",
  );
}

if (errors.length > 0) {
  const envFiles = [
    existsSync(".env.production.local") ? ".env.production.local" : null,
    existsSync(".env.production") ? ".env.production" : null,
    existsSync(".env.local") ? ".env.local" : null,
    existsSync(".env") ? ".env" : null,
  ].filter(Boolean);

  console.error("\n[build] Supabase environment validation failed:\n");
  for (const message of errors) {
    console.error(`  - ${message}`);
  }
  console.error(
    "\nFor Capacitor/iOS production builds, set real values in .env.production",
  );
  console.error("(or .env.production.local) before running npm run build.");
  console.error(`Checked env files (mode=${mode}): ${envFiles.join(", ")}\n`);
  process.exit(1);
}

console.log("[build] Supabase env vars validated for production bundle.");
