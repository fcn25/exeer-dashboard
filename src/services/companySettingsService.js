import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId, getEmployeeId } from "../utils/mobileAuth.js";
import {
  COMPANY_SETTING_KEYS,
  DEFAULT_COMPANY_SETTINGS,
} from "../constants/companySettingsDefaults.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول company_settings غير جاهز. نفّذ ملف supabase/migrations/20250709120000_company_settings.sql في Supabase SQL Editor.";
  }
  return error.message || "تعذّر تحميل إعدادات النظام.";
}

function unwrapSettingValue(raw) {
  if (raw == null) return null;
  if (typeof raw === "object" && raw !== null && "value" in raw) {
    return raw.value;
  }
  return raw;
}

export function rowsToSettingsMap(rows = []) {
  const map = new Map();
  for (const row of rows) {
    map.set(row.setting_key, unwrapSettingValue(row.setting_value));
  }
  return map;
}

export async function fetchCompanySettings(companyId = getCompanyId()) {
  const { data, error } = await supabase
    .from("company_settings")
    .select("setting_key, setting_value")
    .eq("company_id", companyId);

  if (error) throw new Error(mapDbError(error));
  return rowsToSettingsMap(data ?? []);
}

export async function ensureDefaultCompanySettings(
  companyId = getCompanyId(),
  employeeId = getEmployeeId(),
) {
  const existing = await fetchCompanySettings(companyId);
  const missing = DEFAULT_COMPANY_SETTINGS.filter(
    (row) => !existing.has(row.key),
  );

  if (!missing.length) return existing;

  const payload = missing.map((row) => ({
    company_id: companyId,
    setting_key: row.key,
    setting_value: row.value,
    updated_by: employeeId ?? null,
  }));

  const { error } = await supabase.from("company_settings").upsert(payload, {
    onConflict: "company_id,setting_key",
  });

  if (error) throw new Error(mapDbError(error));

  return fetchCompanySettings(companyId);
}

export async function upsertCompanySettings(
  changes,
  { companyId = getCompanyId(), employeeId = getEmployeeId() } = {},
) {
  const entries = Object.entries(changes ?? {}).filter(([key]) =>
    COMPANY_SETTING_KEYS.includes(key),
  );

  if (!entries.length) return;

  const payload = entries.map(([setting_key, value]) => ({
    company_id: companyId,
    setting_key,
    setting_value: value,
    updated_by: employeeId ?? null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("company_settings").upsert(payload, {
    onConflict: "company_id,setting_key",
  });

  if (error) throw new Error(mapDbError(error));
}
