import { supabase } from "../utils/supabaseClient.js";
import { scopeQueryByCompany } from "../utils/tenantScope.js";
import { isMissingColumnError } from "../utils/supabaseErrors.js";

const EMPLOYEE_LOANS_FIX_HINT =
  "نفّذ ملف supabase/scripts/fix_employee_loans.sql في Supabase SQL Editor ثم أعد تحميل الصفحة.";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return `جدول employee_loans غير جاهز. ${EMPLOYEE_LOANS_FIX_HINT}`;
  }
  const message = String(error.message ?? "");
  if (/employee_loans/i.test(message) && /schema cache|does not exist|could not find/i.test(message)) {
    return `جدول سلف الموظفين غير جاهز. ${EMPLOYEE_LOANS_FIX_HINT}`;
  }
  return message || "تعذّر جلب بيانات السلف.";
}

export function isLoanDueForPayrollMonth(loan, payrollMonth) {
  if (!loan?.start_date) return true;
  const [monthPart, yearPart] = String(payrollMonth).split("/");
  const payrollKey = `${yearPart}-${String(monthPart).padStart(2, "0")}`;
  const startKey = String(loan.start_date).slice(0, 7);
  return payrollKey >= startKey;
}

export async function fetchDueLoanInstallmentsByEmployee(
  companyId,
  payrollMonth,
  { skipAlreadyDeducted = true } = {},
) {
  let { data, error } = await scopeQueryByCompany(
    supabase
      .from("employee_loans")
      .select(
        "id, employee_id, monthly_installment, monthly_deduction, status, start_date, installments_remaining, remaining_balance, last_deducted_month",
      )
      .eq("status", "active"),
    companyId,
  );

  if (error && isMissingColumnError(error)) {
    ({ data, error } = await scopeQueryByCompany(
      supabase
        .from("employee_loans")
        .select(
          "id, employee_id, monthly_installment, monthly_deduction, status",
        )
        .eq("status", "active"),
      companyId,
    ));
  }

  if (error) throw new Error(mapDbError(error));

  const totals = new Map();
  const dueLoans = [];

  for (const row of data ?? []) {
    const status = String(row.status ?? "").toLowerCase();
    if (status !== "active") continue; // closed | completed | cancelled

    const employeeId = row.employee_id;
    if (!employeeId) continue;

    const remaining = Number(row.installments_remaining);
    if (Number.isFinite(remaining) && remaining <= 0) continue;
    if (!isLoanDueForPayrollMonth(row, payrollMonth)) continue;
    if (skipAlreadyDeducted && row.last_deducted_month === payrollMonth) {
      continue;
    }

    const installment =
      Number(row.monthly_installment) || Number(row.monthly_deduction) || 0;
    totals.set(employeeId, (totals.get(employeeId) ?? 0) + installment);
    dueLoans.push(row);
  }

  return { totals, dueLoans };
}

export async function markLoanInstallmentsDeducted(
  companyId,
  loans,
  payrollMonth,
) {
  for (const loan of loans) {
    const remaining = Number(loan.installments_remaining);
    const nextRemaining = Number.isFinite(remaining)
      ? Math.max(0, remaining - 1)
      : null;

    const payload = {
      last_deducted_month: payrollMonth,
      updated_at: new Date().toISOString(),
    };

    const installment =
      Number(loan.monthly_installment) || Number(loan.monthly_deduction) || 0;

    if (nextRemaining != null) {
      payload.installments_remaining = nextRemaining;
      if (nextRemaining === 0) {
        payload.status = "completed";
        payload.remaining_balance = 0;
      } else if (Number.isFinite(Number(loan.remaining_balance))) {
        payload.remaining_balance = Math.max(
          0,
          Number(loan.remaining_balance) - installment,
        );
      }
    }

    await scopeQueryByCompany(
      supabase.from("employee_loans").update(payload).eq("id", loan.id),
      companyId,
    );
  }
}
