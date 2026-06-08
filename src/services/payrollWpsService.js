import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import { isHrPayrollStaff } from "../utils/rbac.js";
import { checkWpsReadiness } from "../utils/payroll/wpsValidation.js";
import {
  fetchPayrollRunForMonth,
  PAYROLL_RUN_STATUSES,
} from "./payrollService.js";
import { getCompanyWpsProfile } from "./companyService.js";
import { fetchCompanySettings } from "./companySettingsService.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  return error.message || "تعذّر إكمال العملية.";
}

function requireCompanyId(actionLabel) {
  const companyId = getCompanyId();
  if (!companyId) {
    throw new Error(`تعذّر ${actionLabel} — لم يتم تحديد المنشأة.`);
  }
  return companyId;
}

function scopeQueryByCompany(query, companyId) {
  return query.eq("company_id", companyId);
}

function parsePayrollPeriod(pickerValue) {
  const match = String(pickerValue ?? "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = match[1];
  const month = match[2];
  return {
    payrollMonth: `${Number(month)}/${year}`,
    month: Number(month),
    year: Number(year),
  };
}

const WPS_PAYROLL_SELECT = `
  id,
  employee_id,
  employee_name,
  payroll_month,
  basic_salary,
  housing_allowance,
  transport_allowance,
  other_allowances,
  allowances,
  commissions,
  additional,
  gosi_deduction,
  gosi,
  delay_deductions,
  penalty_deductions,
  loan_deductions,
  lateness_deduction,
  delays,
  penalties,
  net_salary,
  net,
  employees (
    id,
    full_name,
    nationality,
    is_saudi,
    id_number,
    iqama_number,
    iban,
    bank_name,
    job_title_name
  )
`;

function assertHrCanExportWps() {
  if (!isHrPayrollStaff()) {
    throw new Error("تصدير WPS متاح لمالك المنشأة وموارد البشرية فقط.");
  }
}

async function assertLockedPayrollRun(companyId, payrollMonth) {
  const run = await fetchPayrollRunForMonth(companyId, payrollMonth);
  if (!run || run.status !== PAYROLL_RUN_STATUSES.LOCKED) {
    throw new Error("تصدير WPS متاح فقط لمسير مقفل.");
  }
  return run;
}

/**
 * Read-only fetch of payroll rows for WPS export / readiness.
 */
export async function fetchPayrollWpsRows(pickerValue) {
  assertHrCanExportWps();

  const period = parsePayrollPeriod(pickerValue);
  if (!period) throw new Error("يرجى اختيار شهر صالح.");

  const companyId = requireCompanyId("تصدير WPS");
  await assertLockedPayrollRun(companyId, period.payrollMonth);

  let { data, error } = await scopeQueryByCompany(
    supabase
      .from("payroll_records")
      .select(WPS_PAYROLL_SELECT)
      .eq("payroll_month", period.payrollMonth)
      .order("employee_name", { ascending: true }),
    companyId,
  );

  if (error && String(error.message ?? "").includes("payroll_month")) {
    ({ data, error } = await scopeQueryByCompany(
      supabase
        .from("payroll_records")
        .select(WPS_PAYROLL_SELECT)
        .eq("month", period.month)
        .eq("year", period.year)
        .order("employee_name", { ascending: true }),
      companyId,
    ));
  }

  if (error) throw new Error(mapDbError(error));
  if (!data?.length) {
    throw new Error("لا توجد سجلات مسير لتصدير WPS.");
  }

  return data;
}

export async function checkPayrollWpsReadiness(pickerValue) {
  assertHrCanExportWps();

  const period = parsePayrollPeriod(pickerValue);
  if (!period) throw new Error("يرجى اختيار شهر صالح.");

  const companyId = requireCompanyId("فحص جاهزية WPS");
  await assertLockedPayrollRun(companyId, period.payrollMonth);

  const [company, records, settingsMap] = await Promise.all([
    getCompanyWpsProfile(),
    fetchPayrollWpsRows(pickerValue),
    fetchCompanySettings(),
  ]);

  const warningRatio = Number(settingsMap.get("wps_net_gross_warning_ratio"));
  const report = checkWpsReadiness({
    company,
    records,
    warningRatio: Number.isFinite(warningRatio) ? warningRatio : 0.5,
  });

  return {
    ...report,
    payrollMonth: period.payrollMonth,
    company,
    records,
  };
}
