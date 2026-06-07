import { createClient } from "@supabase/supabase-js";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const serviceRoleKey = String(
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ??
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY ??
    "",
).trim();

const PLACEHOLDER_TOKENS = [
  "your-project",
  "your-service-role",
  "your-publishable",
  "your-anon",
];

function isConfiguredValue(value) {
  if (!value) return false;
  const lower = value.toLowerCase();
  return !PLACEHOLDER_TOKENS.some((token) => lower.includes(token));
}

export const isSupabaseAdminConfigured =
  isConfiguredValue(supabaseUrl) && isConfiguredValue(serviceRoleKey);

/** Service-role client — bypasses RLS. Use only for company_settings with company_id scoping. */
export const supabaseAdmin = isSupabaseAdminConfigured
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;

export function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error(
      "مفتاح Supabase Service Role غير مضبوط. أضف VITE_SUPABASE_SERVICE_ROLE_KEY في .env ثم أعد تشغيل الخادم.",
    );
  }
  return supabaseAdmin;
}
