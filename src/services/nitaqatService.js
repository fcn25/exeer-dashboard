import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import { computeNitaqatSnapshot } from "../utils/nitaqat.js";
import { fetchCompanySettings } from "./companySettingsService.js";

const EMPLOYEE_SELECT =
  "id, full_name, nationality, is_saudi, basic_salary, housing_allowance, role, employment_status, is_active";

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

export async function fetchNitaqatDashboardSnapshot() {
  const companyId = getCompanyId();

  const [employeesResult, companyResult, settingsMap] = await Promise.all([
    supabase.from("employees").select(EMPLOYEE_SELECT).eq("company_id", companyId),
    supabase
      .from("companies")
      .select("id, sector_id, sectors!companies_sector_id_fkey(name_ar)")
      .eq("id", companyId)
      .maybeSingle(),
    fetchCompanySettings(companyId),
  ]);

  if (employeesResult.error) throw new Error(employeesResult.error.message);

  const workforce = (employeesResult.data ?? []).filter(isActiveWorkforceEmployee);
  const ownerRow = workforce.find(
    (row) => String(row.role ?? "").trim().toLowerCase() === "owner",
  );

  const sectorName =
    companyResult.data?.sectors?.name_ar?.trim() ||
    (companyResult.data?.sector_id ? null : null);

  const requiredGreen = parseThreshold(settingsMap.get("nitaqat_required_green"));
  const requiredPlatinum = parseThreshold(
    settingsMap.get("nitaqat_required_platinum"),
  );

  return computeNitaqatSnapshot({
    workforce,
    ownerEmployeeId: ownerRow?.id ?? null,
    requiredGreen,
    requiredPlatinum,
    sectorName: sectorName || null,
  });
}
