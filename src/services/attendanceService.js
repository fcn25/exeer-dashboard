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
import {
  buildTodayAttendanceSummary,
  formatAttendanceClockTime,
  formatWorkingDuration,
} from "../utils/attendance/summary.js";

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

function isMissingAttendanceLogsTable(error) {
  if (!error) return false;
  const message = String(error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST205" ||
    (message.includes("attendance_logs") &&
      (message.includes("does not exist") || message.includes("schema cache")))
  );
}

function isMissingBranchRelationship(error) {
  if (!error) return false;
  if (error.code === "PGRST200") return true;
  return /relationship.*company_branches/i.test(error.message ?? "");
}

function formatPunchTypeLabel(punchType) {
  if (punchType === "In") return "حضور";
  if (punchType === "Out") return "انصراف";
  return punchType ?? "—";
}

function formatPunchedAt(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatGpsCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "—";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function punchedAtRangeBounds(dateFrom, dateTo) {
  const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
  const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
  return {
    fromIso: from && !Number.isNaN(from.getTime()) ? from.toISOString() : null,
    toIso: to && !Number.isNaN(to.getTime()) ? to.toISOString() : null,
  };
}

function mapAttendanceLogRow(row) {
  if (!row) return null;

  const employee = row.employees ?? {};
  const branch = row.company_branches ?? null;

  return {
    id: row.id,
    employeeId: row.employee_id ?? null,
    employeeNumber: employee.employee_number ?? "—",
    employeeName: employee.full_name ?? "—",
    punchType: row.punch_type ?? null,
    punchTypeLabel: formatPunchTypeLabel(row.punch_type),
    punchedAt: row.punched_at ?? null,
    punchedAtLabel: formatPunchedAt(row.punched_at),
    branchId: row.branch_id ?? null,
    branchName: branch?.name ?? "—",
    gpsCoordinates: formatGpsCoordinates(row.latitude, row.longitude),
  };
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

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function mapHistoryRow(row) {
  const summary = buildTodayAttendanceSummary(row);
  const recordDate = row.record_date;
  let dateLabel = recordDate ?? "—";
  let dayLabel = "—";

  if (recordDate) {
    try {
      const date = new Date(`${recordDate}T12:00:00`);
      dateLabel = new Intl.DateTimeFormat("ar-SA", {
        day: "numeric",
        month: "long",
      }).format(date);
      dayLabel = new Intl.DateTimeFormat("ar-SA", { weekday: "long" }).format(
        date,
      );
    } catch {
      // keep defaults
    }
  }

  const isLeave = row.status === "إجازة";

  return {
    id: row.id ?? recordDate,
    date: recordDate,
    dayLabel,
    dateLabel,
    checkIn: row.check_in_1
      ? formatAttendanceClockTime(row.check_in_1)
      : null,
    checkOut: row.check_out_1
      ? formatAttendanceClockTime(row.check_out_1)
      : null,
    workingHours: formatWorkingDuration(summary.workingMinutes),
    delayMinutes: summary.delayMinutes,
    status: isLeave ? "leave" : row.status === "غياب" ? "absent" : "present",
    statusLabel: isLeave ? "إجازة" : row.status === "غياب" ? "غياب" : undefined,
  };
}

export async function fetchRecentAttendanceHistory(employeeId, limit = 14) {
  const companyId = requireCompanyId("تحميل سجل الحضور");
  const resolvedEmployeeId = Number(employeeId);
  if (!Number.isFinite(resolvedEmployeeId) || resolvedEmployeeId <= 0) {
    return [];
  }

  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("attendance_records")
      .select(
        "id, record_date, check_in_1, check_out_1, check_in_2, check_out_2, status, delay_minutes",
      )
      .eq("employee_id", resolvedEmployeeId)
      .order("record_date", { ascending: false })
      .limit(limit),
    companyId,
  );

  if (error && !isMissingAttendanceTable(error)) {
    throw new Error(mapDbError(error));
  }

  return (data ?? []).map(mapHistoryRow);
}

export async function fetchTodayAttendanceForEmployee(employeeId) {
  const companyId = requireCompanyId("تحميل حضور اليوم");
  const resolvedEmployeeId = Number(employeeId);
  if (!Number.isFinite(resolvedEmployeeId) || resolvedEmployeeId <= 0) {
    return buildTodayAttendanceSummary(null);
  }

  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("attendance_records")
      .select(
        "check_in_1, check_out_1, check_in_2, check_out_2, status, delay_minutes",
      )
      .eq("employee_id", resolvedEmployeeId)
      .eq("record_date", todayIsoDate()),
    companyId,
  ).maybeSingle();

  if (error && !isMissingAttendanceTable(error)) {
    throw new Error(mapDbError(error));
  }

  return buildTodayAttendanceSummary(data ?? null);
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

export async function fetchAttendanceLogs({
  dateFrom,
  dateTo,
  search = "",
}) {
  const companyId = requireCompanyId("تحميل سجل البصمات");
  const { fromIso, toIso } = punchedAtRangeBounds(dateFrom, dateTo);

  let query = scopeQueryByCompany(
    supabase
      .from("attendance_logs")
      .select(
        `
        id,
        employee_id,
        branch_id,
        punch_type,
        punched_at,
        latitude,
        longitude,
        employees!inner (
          id,
          full_name,
          employee_number
        ),
        company_branches (
          id,
          name
        )
      `,
      )
      .order("punched_at", { ascending: false }),
    companyId,
  );

  if (fromIso) query = query.gte("punched_at", fromIso);
  if (toIso) query = query.lte("punched_at", toIso);

  let { data, error } = await query;

  if (error && (isMissingEmployeeRelationship(error) || isMissingBranchRelationship(error))) {
    let plainQuery = scopeQueryByCompany(
      supabase
        .from("attendance_logs")
        .select(
          "id, employee_id, branch_id, punch_type, punched_at, latitude, longitude",
        )
        .order("punched_at", { ascending: false }),
      companyId,
    );

    if (fromIso) plainQuery = plainQuery.gte("punched_at", fromIso);
    if (toIso) plainQuery = plainQuery.lte("punched_at", toIso);

    const fallback = await plainQuery;
    data = fallback.data;
    error = fallback.error;

    if (!error && (data ?? []).length > 0) {
      const employeeMap = await loadEmployeeNumberMap(companyId);
      const employeesById = new Map(
        [...employeeMap.values()].map((employee) => [employee.id, employee]),
      );

      const branchIds = [
        ...new Set(
          (data ?? [])
            .map((row) => row.branch_id)
            .filter((id) => id != null && id !== ""),
        ),
      ];

      const branchesById = new Map();
      if (branchIds.length > 0) {
        const { data: branches, error: branchError } = await scopeQueryByCompany(
          supabase.from("company_branches").select("id, name").in("id", branchIds),
          companyId,
        );
        if (!branchError) {
          for (const branch of branches ?? []) {
            branchesById.set(branch.id, branch);
          }
        }
      }

      data = (data ?? []).map((row) => ({
        ...row,
        employees: employeesById.get(row.employee_id) ?? null,
        company_branches: row.branch_id
          ? (branchesById.get(row.branch_id) ?? null)
          : null,
      }));
    }
  }

  if (error) {
    if (isMissingAttendanceLogsTable(error)) {
      return [];
    }
    throw new Error(mapDbError(error));
  }

  const needle = String(search ?? "").trim().toLowerCase();
  let rows = (data ?? []).map(mapAttendanceLogRow).filter(Boolean);

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

/**
 * @deprecated Safe Protocol — use «تحديث أرقام المسير» on Payroll page instead.
 */
export async function exportAttendanceDeductionsToPayroll() {
  throw new Error(
    "تم إيقاف الترحيل المباشر من الحضور. افتح مسير الرواتب واضغط «تحديث أرقام المسير» لمزامنة التأخيرات والجزاءات والقروض.",
  );
}
