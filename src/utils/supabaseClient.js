import { createClient } from "@supabase/supabase-js";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

const PLACEHOLDER_TOKENS = [
  "your-project",
  "your-publishable",
  "your-anon",
];

function isConfiguredSupabaseValue(value) {
  if (!value) return false;
  const lower = value.toLowerCase();
  return !PLACEHOLDER_TOKENS.some((token) => lower.includes(token));
}

if (!isConfiguredSupabaseValue(supabaseUrl) || !isConfiguredSupabaseValue(supabaseAnonKey)) {
  const message = import.meta.env.PROD
    ? "Supabase is not configured in this production build. Rebuild with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set in .env.production, then run npx cap sync ios."
    : "Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (see .env.example).";

  throw new Error(message);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
