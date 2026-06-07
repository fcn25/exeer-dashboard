import { supabase } from "../utils/supabaseClient.js";
import { requireCompanyId, scopeQueryByCompany } from "../utils/tenantScope.js";
import { isMissingColumnError } from "../utils/supabaseErrors.js";
import { listActiveEmployees } from "./employeesService.js";
import {
  buildPayrollDraftFromEmployee,
  formatPayrollMonthFromPicker,
  mapPayrollRecordRow,
} from "../utils/payroll/calculations.js";
import { fetchDueLoanInstallmentsByEmployee } from "./payrollLoanService.js";

export const PAYROLL_SCHEMA_FIX_HINT =
  "نفّذ ملف supabase/migrations/20250624000000_payroll_records_columns.sql أو supabase/scripts/fix_payroll_records_schema.sql في Supabase SQL Editor ثم أعد تحميل Schema Cache.";

const PAYROLL_EMPLOYEE_FK_HINT =
  "نفّذ SQL ربط payroll_records.employee_id → employees.id (ملف 20250603000001_payroll_employee_fk.sql) ثم حدّث Schema Cache.";

function isMissingPayrollEmployeeRelationship(error) {
  if (!error) return false;
  if (error.code === "PGRST200") return true;
  return /relationship.*payroll_records.*employees/i.test(error.message ?? "");
}

function isMissingPayrollMonthColumn(error) {
  if (!error) return false;
  const message = String(error.message ?? "").toLowerCase();
  return message.includes("payroll_month") && message.includes("does not exist");
}

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جداول قاعدة البيانات غير جاهزة. نفّذ ملف supabase/migrations/20250602000000_exeer_schema.sql و 20250603000000_payroll_engine.sql في Supabase SQL Editor.";
  }
  if (isMissingColumnError(error) || isMissingPayrollMonthColumn(error)) {
    return `عمود payroll_month غير موجود. ${PAYROLL_SCHEMA_FIX_HINT}`;
  }
  if (isMissingPayrollEmployeeRelationship(error)) {
    return `تعذّر ربط جدول المسير بالموظفين. ${PAYROLL_EMPLOYEE_FK_HINT}`;
  }
  if (error.code === "23505") {
    return "سجل المسير موجود مسبقاً لهذا الموظف في نفس الشهر.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

function parsePayrollPeriod(pickerValue) {
  const payrollMonth = formatPayrollMonthFromPicker(pickerValue);
  if (!payrollMonth) return null;
  const [monthPart, yearPart] = payrollMonth.split("/");
  const month = Number(monthPart);
  const year = Number(yearPart);
  if (!month || !year) return null;
  return { payrollMonth, month, year };
}

function buildPayrollRecordPayload(companyId, draft, period, includePayrollMonth) {
  const payload = {
    company_id: companyId,
    employee_id: draft.employee_id,
    employee_name: draft.employee_name,
    month: period.month,
    year: period.year,
    basic_salary: draft.basic_salary,
    housing_allowance: draft.housing_allowance,
    other_allowances: draft.other_allowances,
    allowances: draft.other_allowances,
    loan_deductions: draft.loan_deductions ?? 0,
    commissions: draft.commissions,
    additional: draft.additional,
    penalty_deductions: draft.penalty_deductions ?? draft.penalties ?? 0,
    delay_deductions: draft.delay_deductions ?? draft.lateness_deduction ?? 0,
    penalties: draft.penalty_deductions ?? draft.penalties ?? 0,
    gosi_deduction: draft.gosi_deduction,
    gosi: draft.gosi_deduction,
    lateness_deduction: draft.delay_deductions ?? draft.lateness_deduction ?? 0,
    delays: draft.delay_deductions ?? draft.lateness_deduction ?? 0,
    net_salary: draft.net_salary,
    net: draft.net_salary,
    status: "draft",
  };

  if (includePayrollMonth) {
    payload.payroll_month = draft.payroll_month;
  }

  return payload;
}

async function queryPayrollByPayrollMonth(companyId, payrollMonth) {
  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("payroll_records")
      .select("*, employees ( id, full_name )")
      .eq("payroll_month", payrollMonth),
    companyId,
  ).order("employee_name", { ascending: true });

  if (!error) return { data: data ?? [], usedFallback: false, mode: "payroll_month" };

  if (!isMissingPayrollMonthColumn(error) && !isMissingPayrollEmployeeRelationship(error)) {
    throw new Error(mapDbError(error));
  }

  if (isMissingPayrollEmployeeRelationship(error)) {
    const plain = await scopeQueryByCompany(
      supabase.from("payroll_records").select("*").eq("payroll_month", payrollMonth),
      companyId,
    ).order("employee_name", { ascending: true });
    if (plain.error && !isMissingPayrollMonthColumn(plain.error)) {
      throw new Error(mapDbError(plain.error));
    }
    if (!plain.error) {
      return { data: plain.data ?? [], usedFallback: true, mode: "payroll_month" };
    }
  }

  return null;
}

async function queryPayrollByLegacyMonthYear(companyId, month, year) {
  const { data, error } = await scopeQueryByCompany(
    supabase.from("payroll_records").select("*").eq("month", month).eq("year", year),
    companyId,
  ).order("employee_name", { ascending: true });

  if (error) throw new Error(mapDbError(error));
  return { data: data ?? [], usedFallback: true, mode: "month_year" };
}

async function queryPayrollRecordsForMonth(companyId, period) {
  const byMonth = await queryPayrollByPayrollMonth(
    companyId,
    period.payrollMonth,
  );
  if (byMonth) return byMonth;

  return queryPayrollByLegacyMonthYear(companyId, period.month, period.year);
}

async function findExistingRecord(companyId, period, employeeId, includePayrollMonth) {
  if (includePayrollMonth) {
    const { data } = await scopeQueryByCompany(
      supabase
        .from("payroll_records")
        .select("id, status, employee_id")
        .eq("payroll_month", period.payrollMonth)
        .eq("employee_id", employeeId),
      companyId,
    ).maybeSingle();
    if (data) return data;
  }

  const { data: legacy } = await scopeQueryByCompany(
    supabase
      .from("payroll_records")
      .select("id, status, employee_id")
      .eq("month", period.month)
      .eq("year", period.year)
      .eq("employee_id", employeeId),
    companyId,
  ).maybeSingle();

  return legacy;
}

export async function fetchPayrollForMonth(pickerValue) {
  const period = parsePayrollPeriod(pickerValue);
  if (!period) {
    return {
      rows: [],
      payrollMonth: "",
      isExported: false,
      hasRecords: false,
      schemaWarning: null,
    };
  }

  const companyId = requireCompanyId("تحميل المسير");
  const { data, usedFallback, mode } = await queryPayrollRecordsForMonth(
    companyId,
    period,
  );

  const rows = data.map(mapPayrollRecordRow).filter(Boolean);
  const isExported = rows.some((row) => row.status === "exported");

  let schemaWarning = null;
  if (usedFallback && mode === "payroll_month") {
    schemaWarning = PAYROLL_EMPLOYEE_FK_HINT;
  }
  if (mode === "month_year") {
    schemaWarning = PAYROLL_SCHEMA_FIX_HINT;
  }

  return {
    rows,
    payrollMonth: period.payrollMonth,
    isExported,
    hasRecords: rows.length > 0,
    schemaWarning,
  };
}

/**
 * Adds active employees missing from an existing draft payroll month (e.g. system owner).
 */
export async function ensureActiveEmployeesInPayroll(pickerValue) {
  const period = parsePayrollPeriod(pickerValue);
  if (!period) return { addedCount: 0, payrollMonth: "" };

  const companyId = requireCompanyId("تحديث المسير");
  const { data: payrollRows, mode } = await queryPayrollRecordsForMonth(
    companyId,
    period,
  );

  if (!payrollRows.length) {
    return { addedCount: 0, payrollMonth: period.payrollMonth };
  }

  const isExported = payrollRows.some(
    (row) => String(row.status ?? "").trim().toLowerCase() === "exported",
  );
  if (isExported) {
    return { addedCount: 0, payrollMonth: period.payrollMonth };
  }

  const employees = await listActiveEmployees();
  const existingIds = new Set(
    payrollRows.map((row) => Number(row.employee_id)).filter(Boolean),
  );

  const { totals: loanByEmployee } = await fetchDueLoanInstallmentsByEmployee(
    companyId,
    period.payrollMonth,
    { skipAlreadyDeducted: false },
  );

  let includePayrollMonth = mode !== "month_year";
  let addedCount = 0;
  let upsertError = null;

  for (const employee of employees) {
    if (existingIds.has(Number(employee.id))) continue;

    const draft = buildPayrollDraftFromEmployee(
      employee,
      period.payrollMonth,
      loanByEmployee.get(employee.id) ?? 0,
    );
    let payload = buildPayrollRecordPayload(
      companyId,
      draft,
      period,
      includePayrollMonth,
    );

    let { error } = await supabase.from("payroll_records").insert(payload);

    if (
      error &&
      includePayrollMonth &&
      (isMissingPayrollMonthColumn(error) || isMissingColumnError(error))
    ) {
      includePayrollMonth = false;
      payload = buildPayrollRecordPayload(companyId, draft, period, false);
      ({ error } = await supabase.from("payroll_records").insert(payload));
    }

    if (error) {
      upsertError = error;
      continue;
    }

    addedCount += 1;
  }

  if (upsertError && addedCount === 0) {
    throw new Error(mapDbError(upsertError));
  }

  return { addedCount, payrollMonth: period.payrollMonth };
}

export async function generatePayrollForMonth(pickerValue) {
  const period = parsePayrollPeriod(pickerValue);
  if (!period) {
    throw new Error("يرجى اختيار شهر صالح.");
  }

  const companyId = requireCompanyId("إنشاء المسير الشهري");
  const existing = await fetchPayrollForMonth(pickerValue);

  if (existing.hasRecords) {
    throw new Error("تم إنشاء مسير هذا الشهر بالفعل.");
  }

  const employees = await listActiveEmployees();
  if (employees.length === 0) {
    throw new Error(
      "لا يوجد موظفون نشطون. أضف موظفين بحالة «نشط» من صفحة الموظفين أولاً.",
    );
  }

  const { totals: loanByEmployee } = await fetchDueLoanInstallmentsByEmployee(
    companyId,
    period.payrollMonth,
    { skipAlreadyDeducted: false },
  );

  let includePayrollMonth = true;
  let upsertError = null;

  for (const employee of employees) {
    const loanDeduction = loanByEmployee.get(employee.id) ?? 0;
    const draft = buildPayrollDraftFromEmployee(
      employee,
      period.payrollMonth,
      loanDeduction,
    );
    let payload = buildPayrollRecordPayload(
      companyId,
      draft,
      period,
      includePayrollMonth,
    );

    let existingRow = await findExistingRecord(
      companyId,
      period,
      employee.id,
      includePayrollMonth,
    );

    if (existingRow?.status === "exported") continue;

    if (existingRow?.id) {
      const { error } = await scopeQueryByCompany(
        supabase.from("payroll_records").update(payload),
        companyId,
      ).eq("id", existingRow.id);
      if (error) upsertError = error;
      continue;
    }

    let { error } = await supabase.from("payroll_records").insert(payload);

    if (
      error &&
      includePayrollMonth &&
      (isMissingPayrollMonthColumn(error) || isMissingColumnError(error))
    ) {
      includePayrollMonth = false;
      payload = buildPayrollRecordPayload(companyId, draft, period, false);
      existingRow = await findExistingRecord(companyId, period, employee.id, false);
      if (existingRow?.status === "exported") continue;
      if (existingRow?.id) {
        ({ error } = await scopeQueryByCompany(
          supabase.from("payroll_records").update(payload),
          companyId,
        ).eq("id", existingRow.id));
      } else {
        ({ error } = await supabase.from("payroll_records").insert(payload));
      }
    }

    if (error && !upsertError) upsertError = error;
  }

  if (upsertError) throw new Error(mapDbError(upsertError));

  return fetchPayrollForMonth(pickerValue);
}

export async function exportPayrollMonth(pickerValue) {
  const period = parsePayrollPeriod(pickerValue);
  if (!period) {
    throw new Error("يرجى اختيار شهر صالح.");
  }

  const companyId = requireCompanyId("تصدير المسير");
  const { rows, isExported } = await fetchPayrollForMonth(pickerValue);

  if (rows.length === 0) {
    throw new Error("لا توجد سجلات مسير لتصديرها.");
  }

  if (isExported) {
    return { rows, payrollMonth: period.payrollMonth, alreadyExported: true };
  }

  if (period.payrollMonth) {
    const byMonth = await scopeQueryByCompany(
      supabase
        .from("payroll_records")
        .update({ status: "exported" })
        .eq("payroll_month", period.payrollMonth),
      companyId,
    );
    if (byMonth.error && isMissingPayrollMonthColumn(byMonth.error)) {
      const legacy = await scopeQueryByCompany(
        supabase
          .from("payroll_records")
          .update({ status: "exported" })
          .eq("month", period.month)
          .eq("year", period.year),
        companyId,
      );
      if (legacy.error) throw new Error(mapDbError(legacy.error));
    } else if (byMonth.error) {
      throw new Error(mapDbError(byMonth.error));
    }
  }

  const refreshed = await fetchPayrollForMonth(pickerValue);
  return { ...refreshed, alreadyExported: false };
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function resolveRecordPeriod(row) {
  if (row.payroll_month) {
    const [monthPart, yearPart] = String(row.payroll_month).split("/");
    const month = Number(monthPart);
    const year = Number(yearPart);
    if (!month || !year) return null;
    return {
      payrollMonth: row.payroll_month,
      month,
      year,
      pickerValue: `${year}-${String(month).padStart(2, "0")}`,
    };
  }

  const month = Number(row.month);
  const year = Number(row.year);
  if (!month || !year) return null;

  return {
    payrollMonth: `${String(month).padStart(2, "0")}/${year}`,
    month,
    year,
    pickerValue: `${year}-${String(month).padStart(2, "0")}`,
  };
}

function normalizeHistoryStatus(status) {
  return String(status ?? "draft").trim().toLowerCase() === "exported"
    ? "exported"
    : "draft";
}

export async function fetchPayrollHistorySummaries({ year, month } = {}) {
  const companyId = requireCompanyId("سجل المسيرات");
  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("payroll_records")
      .select("payroll_month, month, year, net_salary, net, status, created_at"),
    companyId,
  );

  if (error) throw new Error(mapDbError(error));

  const yearFilter = year ? Number(year) : null;
  const monthFilter = month ? Number(month) : null;
  const groups = new Map();

  for (const row of data ?? []) {
    const period = resolveRecordPeriod(row);
    if (!period) continue;
    if (yearFilter && period.year !== yearFilter) continue;
    if (monthFilter && period.month !== monthFilter) continue;

    const key = period.payrollMonth;
    if (!groups.has(key)) {
      groups.set(key, {
        payrollMonth: period.payrollMonth,
        pickerValue: period.pickerValue,
        month: period.month,
        year: period.year,
        employeeCount: 0,
        totalNet: 0,
        statuses: new Set(),
        createdAt: row.created_at ?? null,
      });
    }

    const group = groups.get(key);
    group.employeeCount += 1;
    group.totalNet += Number(row.net_salary ?? row.net) || 0;
    group.statuses.add(normalizeHistoryStatus(row.status));

    if (
      row.created_at &&
      (!group.createdAt || String(row.created_at) < String(group.createdAt))
    ) {
      group.createdAt = row.created_at;
    }
  }

  return [...groups.values()]
    .map((group) => ({
      payrollMonth: group.payrollMonth,
      pickerValue: group.pickerValue,
      month: group.month,
      year: group.year,
      employeeCount: group.employeeCount,
      totalNet: roundMoney(group.totalNet),
      status: group.statuses.has("exported") ? "exported" : "draft",
      createdAt: group.createdAt,
    }))
    .sort((a, b) => b.year - a.year || b.month - a.month);
}

export async function fetchPayrollHistoryYears() {
  const summaries = await fetchPayrollHistorySummaries();
  return [...new Set(summaries.map((item) => item.year))].sort(
    (a, b) => b - a,
  );
}
