import { supabase } from "../utils/supabaseClient.js";
import {
  requireCompanyId,
  requireEmployeeId,
  scopeQueryByCompany,
} from "../utils/tenantScope.js";
import { isMissingColumnError } from "../utils/supabaseErrors.js";
import { listActiveEmployees } from "./employeesService.js";
import {
  buildPayrollDraftFromEmployee,
  formatPayrollMonthFromPicker,
  mapPayrollRecordRow,
} from "../utils/payroll/calculations.js";
import { fetchDueLoanInstallmentsByEmployee } from "./payrollLoanService.js";
import {
  getCurrentUserRole,
  isAccountantRole,
  isHrPayrollStaff,
} from "../utils/rbac.js";

export const PAYROLL_SCHEMA_FIX_HINT =
  "نفّذ ملف supabase/migrations/20250624000000_payroll_records_columns.sql أو supabase/scripts/fix_payroll_records_schema.sql في Supabase SQL Editor ثم أعد تحميل Schema Cache.";

export const PAYROLL_RUN_LOCKED_MESSAGE = "المسير مقفل";
export const PAYROLL_RUN_EDIT_BLOCKED_MESSAGE = "لا يمكن التعديل في هذه الحالة";

export const PAYROLL_RUN_STATUSES = {
  DRAFT: "draft",
  UNDER_REVIEW: "under_review",
  PENDING_APPROVAL: "pending_approval",
  LOCKED: "locked",
  CANCELLED: "cancelled",
};

export const PAYROLL_RUN_STATUS_LABELS = {
  [PAYROLL_RUN_STATUSES.UNDER_REVIEW]: "قيد المراجعة (المحاسب)",
  [PAYROLL_RUN_STATUSES.PENDING_APPROVAL]: "بانتظار اعتماد الموارد البشرية",
  [PAYROLL_RUN_STATUSES.LOCKED]: "مقفل",
  [PAYROLL_RUN_STATUSES.CANCELLED]: "ملغى",
};

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
  const message = String(error.message ?? "");
  if (message.includes("المسير مقفل")) {
    return PAYROLL_RUN_LOCKED_MESSAGE;
  }
  if (message.includes("لا يمكن التعديل في هذه الحالة")) {
    return PAYROLL_RUN_EDIT_BLOCKED_MESSAGE;
  }
  return message || "تعذّر إكمال العملية.";
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

function buildPayrollRecordPayload(
  companyId,
  draft,
  period,
  includePayrollMonth,
  runId = null,
) {
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

  if (runId) {
    payload.run_id = runId;
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
  const [recordsResult, run] = await Promise.all([
    queryPayrollRecordsForMonth(companyId, period),
    fetchPayrollRunForMonth(companyId, period.payrollMonth),
  ]);
  const { data, usedFallback, mode } = recordsResult;

  const rows = data.map(mapPayrollRecordRow).filter(Boolean);
  const isExported = rows.some((row) => row.status === "exported");
  const isRunLocked = isPayrollRunLocked(run);

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
    run,
    runStatus: run?.status ?? null,
    isRunLocked,
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
  const [recordsResult, run] = await Promise.all([
    queryPayrollRecordsForMonth(companyId, period),
    fetchPayrollRunForMonth(companyId, period.payrollMonth),
  ]);
  const { data: payrollRows, mode } = recordsResult;

  if (!payrollRows.length) {
    return { addedCount: 0, payrollMonth: period.payrollMonth };
  }

  assertPayrollRecordsEditable(run);

  const isExported = payrollRows.some(
    (row) => String(row.status ?? "").trim().toLowerCase() === "exported",
  );
  if (isExported) {
    return { addedCount: 0, payrollMonth: period.payrollMonth };
  }

  const runId = run?.id ?? null;

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
      runId,
    );

    let { error } = await supabase.from("payroll_records").insert(payload);

    if (
      error &&
      includePayrollMonth &&
      (isMissingPayrollMonthColumn(error) || isMissingColumnError(error))
    ) {
      includePayrollMonth = false;
      payload = buildPayrollRecordPayload(
        companyId,
        draft,
        period,
        false,
        runId,
      );
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

  if (addedCount > 0) {
    await refreshPayrollRunTotals(companyId, period.payrollMonth);
  }

  return { addedCount, payrollMonth: period.payrollMonth };
}

export async function generatePayrollForMonth(pickerValue) {
  const period = parsePayrollPeriod(pickerValue);
  if (!period) {
    throw new Error("يرجى اختيار شهر صالح.");
  }

  const companyId = requireCompanyId("إنشاء المسير الشهري");
  const employeeId = requireEmployeeId("إنشاء المسير الشهري");

  if (isAccountantRole()) {
    throw new Error(PAYROLL_RUN_EDIT_BLOCKED_MESSAGE);
  }

  const existing = await fetchPayrollForMonth(pickerValue);

  if (existing.isRunLocked) {
    throw new Error(PAYROLL_RUN_LOCKED_MESSAGE);
  }

  if (existing.run) {
    assertHrCanSyncPayroll(existing.run);
  }

  if (existing.hasRecords) {
    throw new Error("تم إنشاء مسير هذا الشهر بالفعل.");
  }

  const payrollRun = await upsertPayrollRunDraft(
    companyId,
    period.payrollMonth,
    employeeId,
  );
  const runId = payrollRun.id;

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
      runId,
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
      payload = buildPayrollRecordPayload(
        companyId,
        draft,
        period,
        false,
        runId,
      );
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

  await refreshPayrollRunTotals(companyId, period.payrollMonth);

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

function mapPayrollRunRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    payrollMonth: row.payroll_month,
    status: String(row.status ?? PAYROLL_RUN_STATUSES.DRAFT).trim().toLowerCase(),
    employeeCount: Number(row.employee_count) || 0,
    totalGross: Number(row.total_gross) || 0,
    totalDeductions: Number(row.total_deductions) || 0,
    totalNet: Number(row.total_net) || 0,
    lockedAt: row.locked_at ?? null,
    lockedBy: row.locked_by ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function isPayrollRunLocked(run) {
  return run?.status === PAYROLL_RUN_STATUSES.LOCKED;
}

export function assertPayrollRunEditable(run) {
  if (isPayrollRunLocked(run)) {
    throw new Error(PAYROLL_RUN_LOCKED_MESSAGE);
  }
  if (run?.status === PAYROLL_RUN_STATUSES.CANCELLED) {
    throw new Error(PAYROLL_RUN_EDIT_BLOCKED_MESSAGE);
  }
}

export function assertAccountantCanEditPayroll(run) {
  assertPayrollRunEditable(run);
  if (run?.status !== PAYROLL_RUN_STATUSES.UNDER_REVIEW) {
    throw new Error(PAYROLL_RUN_EDIT_BLOCKED_MESSAGE);
  }
}

export function assertHrCanSyncPayroll(run) {
  assertPayrollRunEditable(run);
  const status = run?.status;
  if (
    status !== PAYROLL_RUN_STATUSES.DRAFT &&
    status !== PAYROLL_RUN_STATUSES.UNDER_REVIEW
  ) {
    throw new Error(PAYROLL_RUN_EDIT_BLOCKED_MESSAGE);
  }
}

export function assertPayrollRecordsEditable(run, role = getCurrentUserRole()) {
  if (isAccountantRole(role)) {
    assertAccountantCanEditPayroll(run);
    return;
  }
  if (isHrPayrollStaff(role)) {
    assertHrCanSyncPayroll(run);
    return;
  }
  assertPayrollRunEditable(run);
}

function computeRunTotalsFromRecords(records) {
  let employeeCount = 0;
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  for (const row of records ?? []) {
    employeeCount += 1;
    const basic = Number(row.basic_salary ?? row.basic) || 0;
    const housing = Number(row.housing_allowance ?? row.housing) || 0;
    const allowances = Number(row.other_allowances ?? row.allowances) || 0;
    const commissions = Number(row.commissions) || 0;
    const additional = Number(row.additional) || 0;
    totalGross += basic + housing + allowances + commissions + additional;

    const penalties = Number(row.penalty_deductions ?? row.penalties) || 0;
    const lateness =
      Number(row.delay_deductions ?? row.lateness_deduction ?? row.lateness) ||
      0;
    const loans = Number(row.loan_deductions ?? row.loans) || 0;
    const gosi = Number(row.gosi_deduction ?? row.gosi) || 0;
    totalDeductions += penalties + lateness + loans + gosi;
    totalNet += Number(row.net_salary ?? row.net) || 0;
  }

  return {
    employee_count: employeeCount,
    total_gross: roundMoney(totalGross),
    total_deductions: roundMoney(totalDeductions),
    total_net: roundMoney(totalNet),
  };
}

export async function fetchPayrollRunForMonth(companyId, payrollMonth) {
  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("payroll_runs")
      .select("*")
      .eq("payroll_month", payrollMonth),
    companyId,
  ).maybeSingle();

  if (error) throw new Error(mapDbError(error));
  return mapPayrollRunRow(data);
}

async function upsertPayrollRunDraft(companyId, payrollMonth, createdBy) {
  const existing = await fetchPayrollRunForMonth(companyId, payrollMonth);
  if (existing) {
    assertPayrollRunEditable(existing);
    return existing;
  }

  const { data, error } = await supabase
    .from("payroll_runs")
    .insert({
      company_id: companyId,
      payroll_month: payrollMonth,
      status: PAYROLL_RUN_STATUSES.DRAFT,
      created_by: createdBy,
    })
    .select("*")
    .single();

  if (error) throw new Error(mapDbError(error));
  return mapPayrollRunRow(data);
}

export async function refreshPayrollRunTotals(companyId, payrollMonth) {
  const period = {
    payrollMonth,
    month: Number(payrollMonth.split("/")[0]),
    year: Number(payrollMonth.split("/")[1]),
  };
  const { data } = await queryPayrollRecordsForMonth(companyId, period);
  const totals = computeRunTotalsFromRecords(data ?? []);

  const run = await fetchPayrollRunForMonth(companyId, payrollMonth);
  if (!run?.id) return null;

  const { data: updated, error } = await scopeQueryByCompany(
    supabase
      .from("payroll_runs")
      .update({
        ...totals,
        updated_at: new Date().toISOString(),
      }),
    companyId,
  )
    .eq("id", run.id)
    .select("*")
    .single();

  if (error) throw new Error(mapDbError(error));
  return mapPayrollRunRow(updated);
}

export async function updatePayrollRunStatus(pickerValue, nextStatus) {
  const period = parsePayrollPeriod(pickerValue);
  if (!period) throw new Error("يرجى اختيار شهر صالح.");

  const companyId = requireCompanyId("تحديث حالة المسير");
  const employeeId = requireEmployeeId("تحديث حالة المسير");
  const run = await fetchPayrollRunForMonth(companyId, period.payrollMonth);

  if (!run) {
    throw new Error("لا يوجد مسير لهذا الشهر.");
  }

  const current = run.status;
  const target = String(nextStatus ?? "").trim().toLowerCase();

  if (current === PAYROLL_RUN_STATUSES.LOCKED) {
    throw new Error(PAYROLL_RUN_LOCKED_MESSAGE);
  }

  const allowedTransitions = {
    [PAYROLL_RUN_STATUSES.DRAFT]: [PAYROLL_RUN_STATUSES.UNDER_REVIEW],
    [PAYROLL_RUN_STATUSES.UNDER_REVIEW]: [
      PAYROLL_RUN_STATUSES.DRAFT,
      PAYROLL_RUN_STATUSES.PENDING_APPROVAL,
    ],
    [PAYROLL_RUN_STATUSES.PENDING_APPROVAL]: [
      PAYROLL_RUN_STATUSES.LOCKED,
      PAYROLL_RUN_STATUSES.DRAFT,
      PAYROLL_RUN_STATUSES.UNDER_REVIEW,
    ],
  };

  const allowed = allowedTransitions[current] ?? [];
  if (!allowed.includes(target)) {
    if (target === PAYROLL_RUN_STATUSES.UNDER_REVIEW) {
      throw new Error("لا يمكن إرسال المسير للمراجعة إلا من حالة مسودة.");
    }
    if (target === PAYROLL_RUN_STATUSES.PENDING_APPROVAL) {
      throw new Error(
        "لا يمكن إرسال المسير للموارد البشرية إلا أثناء مراجعة المحاسب.",
      );
    }
    if (target === PAYROLL_RUN_STATUSES.DRAFT) {
      throw new Error(
        "لا يمكن إرجاع المسير كمسودة إلا من المراجعة أو بانتظار الاعتماد.",
      );
    }
    if (target === PAYROLL_RUN_STATUSES.LOCKED) {
      throw new Error(
        "لا يمكن قفل المسير إلا بعد اعتماد الموارد البشرية.",
      );
    }
    throw new Error("انتقال حالة المسير غير مسموح.");
  }

  const payload = {
    status: target,
    updated_at: new Date().toISOString(),
  };

  if (target === PAYROLL_RUN_STATUSES.LOCKED) {
    payload.locked_at = new Date().toISOString();
    payload.locked_by = employeeId;
  }

  if (target === PAYROLL_RUN_STATUSES.DRAFT) {
    payload.locked_at = null;
    payload.locked_by = null;
  }

  const { error } = await scopeQueryByCompany(
    supabase.from("payroll_runs").update(payload),
    companyId,
  ).eq("id", run.id);

  if (error) throw new Error(mapDbError(error));

  return fetchPayrollForMonth(pickerValue);
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
