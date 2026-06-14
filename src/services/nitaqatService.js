import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import { computeNitaqatSnapshot } from "../utils/nitaqat.js";
import { fetchCompanySettings } from "./companySettingsService.js";
import { isMissingColumnError } from "../utils/supabaseErrors.js";

const EMPLOYEE_SELECT_FULL =
  "id, full_name, nationality, is_saudi, basic_salary, housing_allowance, role, employment_status, is_active";

const EMPLOYEE_SELECT_FALLBACK =
  "id, full_name, nationality, is_saudi, basic_salary, housing_allowance, role, employment_status";

const INACTIVE_EMPLOYMENT_STATUSES = new Set(["منتهي الخدمة", "موقوف"]);

function isActiveWorkforceEmployee(row) {
  if (row?.is_active === false) return false;
  const status = String(row?.employment_status ?? "").trim();
  if (!status) return true;
  if (INACTIVE_EMPLOYMENT_STATUSES.has(status)) return false;
  const lower = status.toLowerCase();
  return !["منتهي", "مستقيل", "terminated", "resigned", "inactive"].some(
    (token) => lower === token || lower.includes(token),
  );
}

function parseThreshold(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchWorkforceEmployees(companyId) {
  const full = await supabase
    .from("employees")
    .select(EMPLOYEE_SELECT_FULL)
    .eq("company_id", companyId);

  if (!full.error) return full.data ?? [];

  if (isMissingColumnError(full.error)) {
    const fallback = await supabase
      .from("employees")
      .select(EMPLOYEE_SELECT_FALLBACK)
      .eq("company_id", companyId);
    if (!fallback.error) return fallback.data ?? [];
  }

  return [];
}

async function fetchCompanySectorName(companyId) {
  const withJoin = await supabase
    .from("companies")
    .select("id, sector_id, sectors!companies_sector_id_fkey(name_ar)")
    .eq("id", companyId)
    .maybeSingle();

  if (!withJoin.error) {
    return withJoin.data?.sectors?.name_ar?.trim() || null;
  }

  if (isMissingColumnError(withJoin.error)) {
    const plain = await supabase
      .from("companies")
      .select("id, industry")
      .eq("id", companyId)
      .maybeSingle();
    if (!plain.error) {
      return plain.data?.industry?.trim() || null;
    }
  }

  return null;
}

export async function fetchNitaqatDashboardSnapshot() {
  try {
    const companyId = getCompanyId();
    if (!companyId) return null;

    const [employees, sectorName, settingsMap] = await Promise.all([
      fetchWorkforceEmployees(companyId),
      fetchCompanySectorName(companyId),
      fetchCompanySettings(companyId).catch(() => new Map()),
    ]);

    const workforce = employees.filter(isActiveWorkforceEmployee);
    const ownerRow = workforce.find(
      (row) => String(row.role ?? "").trim().toLowerCase() === "owner",
    );

    const requiredGreen = parseThreshold(settingsMap.get("nitaqat_required_green"));
    const requiredPlatinum = parseThreshold(
      settingsMap.get("nitaqat_required_platinum"),
    );

    return computeNitaqatSnapshot({
      workforce,
      ownerEmployeeId: ownerRow?.id ?? null,
      requiredGreen,
      requiredPlatinum,
      sectorName,
    });
  } catch {
    return null;
  }
}
