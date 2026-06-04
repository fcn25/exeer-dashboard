import { supabase } from "../utils/supabaseClient.js";
import { requireCompanyId, scopeQueryByCompany } from "../utils/tenantScope.js";
import { isMissingColumnError } from "../utils/supabaseErrors.js";
import {
  buildPayrollDraftFromEmployee,
  formatPayrollMonthFromPicker,
} from "../utils/payroll/calculations.js";
import {
  calculateDelayDeduction,
  recalculatePayrollNet,
  resolveEmployeeBaseSalary,
} from "../utils/attendance/deductions.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول سجل الحضور غير موجود. نفّذ supabase/migrations/20250626000000_attendance_records.sql في Supabase.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

function isMissingAttendanceTable(error) {
  if (!error) return false;
  const message = String(error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST205" ||
    (message.includes("attendance_records") &&
      (message.includes("does not exist") || message.includes("schema cache")))
  );
}

function isMissingEmployeeRelationship(error) {
  if (!error) return false;
  if (error.code === "PGRST200") return true;
  return /relationship.*employees/i.test(error.message ?? "");
}

export function formatShiftRange(checkIn, checkOut) {
  const format = (value) => {
    if (!value) return "—";
    return String(value).slice(0, 5);
  };
  if (!checkIn && !checkOut) return "—";
  return `${format(checkIn)} – ${format(checkOut)}`;
}

export function resolvePayrollMonthFromDateRange(dateFrom, dateTo) {
  if (!dateFrom || !dateTo) {
    throw new Error("حدّد نطاق التاريخ (من — إلى) لتحديد شهر المسير.");
  }

  const from = new Date(`${dateFrom}T12:00:00`);
  const to = new Date(`${dateTo}T12:00:00`);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("نطاق التاريخ غير صالح.");
  }

  if (from > to) {
    throw new Error("تاريخ «من» يجب أن يكون قبل «إلى».");
  }

  const fromKey = `${from.getFullYear()}-${from.getMonth()}`;
  const toKey = `${to.getFullYear()}-${to.getMonth()}`;

  if (fromKey !== toKey) {
    throw new Error(
      "نطاق التاريخ يجب أن يقع ضمن شهر واحد لترحيل الخصومات إلى المسير.",
    );
  }

  const month = String(from.getMonth() + 1).padStart(2, "0");
  return formatPayrollMonthFromPicker(`${from.getFullYear()}-${month}`);
}

function safeAmount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function mapAttendanceRow(row) {
  if (!row) return null;

  const employee = row.employees ?? {};
  return {
    id: row.id ?? `${row.employee_id}-${row.record_date}`,
    employeeId: row.employee_id ?? null,
    employeeNumber: employee.employee_number ?? "—",
    employeeName: employee.full_name ?? "—",
    recordDate: row.record_date ?? null,
    shift1: formatShiftRange(row.check_in_1, row.check_out_1),
    shift2: formatShiftRange(row.check_in_2, row.check_out_2),
    status: row.status ?? "—",
    delayMinutes: safeAmount(row.delay_minutes),
  };
}

export async function fetchAttendanceRecords({
  dateFrom,
  dateTo,
  search = "",
}) {
  const companyId = requireCompanyId("تحميل سجل الحضور");

  let query = scopeQueryByCompany(
    supabase
    .from("attendance_records")
    .select(
      `
      id,
      employee_id,
      record_date,
      check_in_1,
      check_out_1,
      check_in_2,
      check_out_2,
      status,
      delay_minutes,
      employees!inner (
        id,
        full_name,
        employee_number
      )
    `,
    ),
    companyId,
  )
    .order("record_date", { ascending: false })
    .order("employee_id", { ascending: true });

  if (dateFrom) query = query.gte("record_date", dateFrom);
  if (dateTo) query = query.lte("record_date", dateTo);

  let { data, error } = await query;

  if (error && isMissingEmployeeRelationship(error)) {
    let plainQuery = scopeQueryByCompany(
      supabase
        .from("attendance_records")
        .select(
          "id, employee_id, record_date, check_in_1, check_out_1, check_in_2, check_out_2, status, delay_minutes",
        ),
      companyId,
    )
      .order("record_date", { ascending: false })
      .order("employee_id", { ascending: true });

    if (dateFrom) plainQuery = plainQuery.gte("record_date", dateFrom);
    if (dateTo) plainQuery = plainQuery.lte("record_date", dateTo);

    const fallback = await plainQuery;
    data = fallback.data;
    error = fallback.error;

    if (!error && (data ?? []).length > 0) {
      const employeeMap = await loadEmployeeNumberMap(companyId);
      const employeesById = new Map(
        [...employeeMap.values()].map((employee) => [employee.id, employee]),
      );
      data = (data ?? []).map((row) => ({
        ...row,
        employees: employeesById.get(row.employee_id) ?? null,
      }));
    }
  }

  if (error) {
    if (isMissingAttendanceTable(error)) {
      throw new Error(mapDbError(error));
    }
    throw new Error(mapDbError(error));
  }

  const needle = String(search ?? "").trim().toLowerCase();
  let rows = (data ?? []).map(mapAttendanceRow).filter(Boolean);

  if (needle) {
    rows = rows.filter((row) => {
      const number = String(row.employeeNumber ?? "").toLowerCase();
      const name = String(row.employeeName ?? "").toLowerCase();
      const id = String(row.employeeId ?? "");
      return (
        number.includes(needle) ||
        name.includes(needle) ||
        id.includes(needle)
      );
    });
  }

  return rows;
}

async function loadEmployeeNumberMap(companyId) {
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, company_id, employee_number, full_name, basic_salary, housing_allowance, other_allowance, nationality, is_saudi, employment_status",
    )
    .eq("company_id", companyId);

  if (error) throw new Error(mapDbError(error));

  const byNumber = new Map();
  for (const employee of data ?? []) {
    const key = String(employee.employee_number ?? "").trim();
    if (key) byNumber.set(key, employee);
    byNumber.set(String(employee.id), employee);
  }
  return byNumber;
}

export async function upsertAttendanceFromCsv(parsedRows) {
  const companyId = requireCompanyId("استيراد سجل الحضور");
  if (!parsedRows?.length) {
    throw new Error("لا توجد صفوف صالحة للاستيراد.");
  }

  const employeeMap = await loadEmployeeNumberMap(companyId);
  const payloads = [];
  const unmatched = [];

  for (const row of parsedRows) {
    const employee =
      employeeMap.get(String(row.employee_number).trim()) ?? null;
    if (!employee) {
      unmatched.push(row.employee_number);
      continue;
    }

    if (employee.company_id != null && Number(employee.company_id) !== companyId) {
      unmatched.push(row.employee_number);
      continue;
    }

    payloads.push({
      company_id: companyId,
      employee_id: employee.id,
      record_date: row.record_date,
      check_in_1: row.check_in_1,
      check_out_1: row.check_out_1,
      check_in_2: row.check_in_2,
      check_out_2: row.check_out_2,
      status: row.status,
      delay_minutes: row.delay_minutes,
    });
  }

  if (unmatched.length > 0) {
    const sample = [...new Set(unmatched)].slice(0, 5).join("، ");
    throw new Error(
      `تعذّر مطابقة ${unmatched.length} سطراً (أرقام وظيفية غير موجودة): ${sample}${unmatched.length > 5 ? "…" : ""}`,
    );
  }

  if (payloads.length === 0) {
    throw new Error("لا توجد سجلات صالحة بعد مطابقة الأرقام الوظيفية.");
  }

  const chunkSize = 200;
  let upserted = 0;

  for (let i = 0; i < payloads.length; i += chunkSize) {
    const chunk = payloads.slice(i, i + chunkSize);
    let { error } = await supabase.from("attendance_records").upsert(chunk, {
      onConflict: "company_id,employee_id,record_date",
    });

    if (error?.code === "42P10") {
      ({ error } = await supabase.from("attendance_records").upsert(chunk, {
        onConflict: "employee_id,record_date",
      }));
    }

    if (error) {
      if (isMissingAttendanceTable(error)) {
        throw new Error(mapDbError(error));
      }
      if (isMissingColumnError(error)) {
        throw new Error(
          `${mapDbError(error)} تأكد من وجود عمود company_id وتشغيل migration 20250627000000_attendance_company_unique.sql`,
        );
      }
      throw new Error(mapDbError(error));
    }
    upserted += chunk.length;
  }

  return { upserted, skipped: parsedRows.length - payloads.length };
}

/** Groups visible attendance rows by employee for delay-minute totals. */
export function aggregateDelayMinutesByEmployee(rows) {
  const map = new Map();

  for (const row of rows) {
    const key = row?.employeeId;
    if (!key) continue;

    const current = map.get(key) ?? {
      employeeId: key,
      totalDelayMinutes: 0,
    };
    current.totalDelayMinutes += safeAmount(row?.delayMinutes);
    map.set(key, current);
  }

  return map;
}

function parsePayrollPeriod(payrollMonth) {
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
    status: "Draft",
  };

  if (includePayrollMonth) {
    payload.payroll_month = draft.payroll_month;
  }

  return payload;
}

const PAYROLL_RECORD_SELECT =
  "id, status, employee_id, employee_name, basic_salary, housing_allowance, other_allowances, allowances, commissions, additional, penalty_deductions, delay_deductions, penalties, gosi_deduction, gosi, lateness_deduction, delays, net_salary, net";

async function findPayrollRecord(companyId, period, employeeId) {
  const legacySelect =
    "id, status, employee_id, employee_name, basic_salary, housing_allowance, other_allowances, allowances, commissions, additional, penalties, gosi_deduction, gosi, lateness_deduction, delays, net_salary, net";

  async function queryByMonth(selectColumns) {
    return scopeQueryByCompany(
      supabase
        .from("payroll_records")
        .select(selectColumns)
        .eq("payroll_month", period.payrollMonth)
        .eq("employee_id", employeeId),
      companyId,
    ).maybeSingle();
  }

  let { data, error } = await queryByMonth(PAYROLL_RECORD_SELECT);
  if (error && isMissingColumnError(error)) {
    ({ data, error } = await queryByMonth(legacySelect));
  }
  if (error) throw new Error(mapDbError(error));
  if (data) return data;

  const { data: legacy, error: legacyError } = await scopeQueryByCompany(
    supabase
      .from("payroll_records")
      .select(legacySelect)
      .eq("month", period.month)
      .eq("year", period.year)
      .eq("employee_id", employeeId),
    companyId,
  ).maybeSingle();

  if (legacyError) throw new Error(mapDbError(legacyError));
  return legacy;
}

function readPenaltyDeduction(record) {
  return safeAmount(
    record?.penalty_deductions ?? record?.penalties ?? 0,
  );
}

function readDelayDeduction(record) {
  return safeAmount(
    record?.delay_deductions ??
      record?.lateness_deduction ??
      record?.delays ??
      0,
  );
}

export async function exportAttendanceDeductionsToPayroll({
  dateFrom,
  dateTo,
}) {
  const companyId = requireCompanyId("ترحيل الحضور للمسير");
  const payrollMonth = resolvePayrollMonthFromDateRange(dateFrom, dateTo);
  const period = parsePayrollPeriod(payrollMonth);
  if (!period) throw new Error("تعذّر تحديد شهر المسير.");

  const attendanceRows = await fetchAttendanceRecords({ dateFrom, dateTo });
  if (!attendanceRows?.length) {
    throw new Error("لا توجد سجلات حضور للترحيل.");
  }

  const aggregates = aggregateDelayMinutesByEmployee(attendanceRows);
  if (aggregates.size === 0) {
    throw new Error("لا توجد سجلات حضور صالحة للترحيل.");
  }

  const employeeMap = await loadEmployeeNumberMap(companyId);
  const employeesById = new Map(
    [...employeeMap.values()].map((employee) => [employee.id, employee]),
  );

  let includePayrollMonth = true;
  let updatedCount = 0;
  let lockedSkipped = 0;

  for (const aggregate of aggregates.values()) {
    const employee = employeesById.get(aggregate.employeeId);
    if (!employee) continue;

    const baseSalary = resolveEmployeeBaseSalary(employee);
    const delayDeductions = calculateDelayDeduction({
      baseSalary,
      totalDelayMinutes: aggregate.totalDelayMinutes,
    });

    const existing = await findPayrollRecord(
      companyId,
      period,
      aggregate.employeeId,
    );

    if (existing?.status === "Exported") {
      lockedSkipped += 1;
      continue;
    }

    if (existing?.id) {
      const penaltyDeduction = readPenaltyDeduction(existing);
      const net = recalculatePayrollNet({
        basicSalary: existing.basic_salary,
        housingAllowance: existing.housing_allowance,
        otherAllowances:
          existing.other_allowances ?? existing.allowances ?? 0,
        commissions: existing.commissions ?? 0,
        additional: existing.additional ?? 0,
        penaltyDeduction,
        delayDeduction: delayDeductions,
        gosiDeduction: existing.gosi_deduction ?? existing.gosi ?? 0,
      });

      const { error } = await scopeQueryByCompany(
        supabase.from("payroll_records").update({
          delay_deductions: delayDeductions,
          lateness_deduction: delayDeductions,
          delays: delayDeductions,
          net_salary: net,
          net,
        }),
        companyId,
      ).eq("id", existing.id);

      if (error) throw new Error(mapDbError(error));
      updatedCount += 1;
      continue;
    }

    const draft = buildPayrollDraftFromEmployee(employee, period.payrollMonth);
    draft.delay_deductions = delayDeductions;
    draft.penalty_deductions = 0;
    draft.lateness_deduction = delayDeductions;
    draft.penalties = 0;
    draft.net_salary = recalculatePayrollNet({
      basicSalary: draft.basic_salary,
      housingAllowance: draft.housing_allowance,
      otherAllowances: draft.other_allowances,
      commissions: draft.commissions,
      additional: draft.additional,
      penaltyDeduction: 0,
      delayDeduction: delayDeductions,
      gosiDeduction: draft.gosi_deduction,
    });

    let payload = buildPayrollRecordPayload(
      companyId,
      draft,
      period,
      includePayrollMonth,
    );
    payload.delay_deductions = delayDeductions;
    payload.penalty_deductions = 0;

    let { error } = await supabase.from("payroll_records").insert(payload);

    if (error && isMissingColumnError(error)) {
      includePayrollMonth = false;
      payload = buildPayrollRecordPayload(companyId, draft, period, false);
      payload.delay_deductions = delayDeductions;
      payload.penalty_deductions = 0;
      ({ error } = await supabase.from("payroll_records").insert(payload));
    }

    if (error) throw new Error(mapDbError(error));
    updatedCount += 1;
  }

  if (updatedCount === 0 && lockedSkipped === 0) {
    throw new Error("لم يتم ترحيل أي سجل. تأكد من وجود مسير غير مُصدَّر للشهر.");
  }

  return {
    updatedCount,
    lockedSkipped,
    payrollMonth,
    employeeCount: aggregates.size,
  };
}
