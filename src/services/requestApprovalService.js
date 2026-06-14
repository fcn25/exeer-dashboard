import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import { createEvent } from "./eventsService.js";
import {
  parseLeaveTypeFromDetails,
  shouldDeductLeaveBalance,
} from "../utils/requestDetails.js";

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
  return message || "تعذّر معالجة الطلب.";
}

async function fetchRequestById(requestId) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("requests")
    .select(
      "*, employees ( id, full_name, leave_balance, employment_status )",
    )
    .eq("company_id", companyId)
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw new Error(mapDbError(error));
  return data;
}

async function applyLeaveApproval(request) {
  const employee = request.employees;
  if (!employee?.id) throw new Error("تعذّر ربط الطلب بسجل الموظف.");

  const leaveType =
    request.leave_type || parseLeaveTypeFromDetails(request.details);
  let leaveDays = Number(request.leave_days);
  if (!Number.isFinite(leaveDays) || leaveDays <= 0) {
    const daysMatch = String(request.details ?? "").match(/(\d+)\s*يوم/);
    leaveDays = daysMatch ? Number(daysMatch[1]) : 0;
  }
  if (!Number.isFinite(leaveDays) || leaveDays <= 0) {
    throw new Error("عدد أيام الإجازة غير صالح في الطلب.");
  }

  if (!request.start_date) {
    request.start_date = String(request.created_at ?? "").slice(0, 10) || null;
  }

  const updates = {
    employment_status: "إجازة",
    updated_at: new Date().toISOString(),
  };

  if (shouldDeductLeaveBalance(leaveType)) {
    const currentBalance = Number(employee.leave_balance) || 0;
    if (leaveDays > currentBalance) {
      throw new Error(
        `رصيد الإجازات غير كافٍ (${currentBalance} يوم متبقٍ، المطلوب ${leaveDays}).`,
      );
    }
    updates.leave_balance = Math.max(0, currentBalance - leaveDays);
  }

  const companyId = getCompanyId();
  const { error } = await supabase
    .from("employees")
    .update(updates)
    .eq("company_id", companyId)
    .eq("id", employee.id);

  if (error) throw new Error(mapDbError(error));

  const startLabel = request.start_date
    ? ` — من ${request.start_date}`
    : "";
  await createEvent({
    name: `إجازة معتمدة: ${employee.full_name}`,
    description: [
      leaveType ? `نوع الإجازة: ${leaveType}` : null,
      `المدة: ${leaveDays} يوم${startLabel}`,
      String(request.details ?? "").trim(),
    ]
      .filter(Boolean)
      .join("\n"),
    datetime: request.start_date
      ? `${request.start_date}T08:00:00`
      : new Date().toISOString(),
    location: "طلبات الموظفين",
    source: "system",
  });
}

async function applyFinancialApproval(request) {
  const employee = request.employees;
  if (!employee?.id) throw new Error("تعذّر ربط الطلب بسجل الموظف.");

  const amount = Number(request.amount);
  const installments = Number(request.installments);
  const monthlyInstallment = Number(request.monthly_deduction);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("مبلغ السلفة غير صالح.");
  }
  if (!Number.isFinite(installments) || installments <= 0) {
    throw new Error("عدد أقساط السلفة غير صالح.");
  }
  if (!Number.isFinite(monthlyInstallment) || monthlyInstallment <= 0) {
    throw new Error("القسط الشهري غير صالح.");
  }
  if (!request.start_date) {
    request.start_date = String(request.created_at ?? "").slice(0, 10) || null;
  }
  if (!request.start_date) {
    throw new Error("تاريخ بداية الخصم مطلوب لاعتماد السلفة.");
  }

  const companyId = getCompanyId();
  const payload = {
    company_id: companyId,
    employee_id: employee.id,
    amount,
    remaining_balance: amount,
    monthly_deduction: monthlyInstallment,
    monthly_installment: monthlyInstallment,
    total_amount: amount,
    installments_total: installments,
    installments_remaining: installments,
    start_date: request.start_date,
    request_id: request.id,
    status: "active",
    notes: `سلفة معتمدة — ${installments} قسط × ${monthlyInstallment} ر.س`,
  };

  const { error } = await supabase.from("employee_loans").insert(payload);
  if (error) throw new Error(mapDbError(error));

  await createEvent({
    name: `سلفة معتمدة: ${employee.full_name}`,
    description: [
      `المبلغ: ${amount} ر.س`,
      `الأقساط: ${installments} × ${monthlyInstallment} ر.س`,
      `بداية الخصم: ${request.start_date}`,
      String(request.details ?? "").trim(),
    ]
      .filter(Boolean)
      .join("\n"),
    datetime: `${request.start_date}T09:00:00`,
    location: "المسير — خصم أقساط",
    source: "system",
  });
}

async function applyGeneralApproval(request) {
  const employeeName = request.employees?.full_name ?? "موظف";
  await createEvent({
    name: `طلب معتمد: ${employeeName}`,
    description: String(request.details ?? "").trim() || "—",
    datetime: new Date().toISOString(),
    location: "طلبات الموظفين",
    source: "system",
  });
}

export async function approveEmployeeRequest(requestId) {
  const request = await fetchRequestById(requestId);
  if (!request) throw new Error("الطلب غير موجود.");
  if (request.status !== "Pending" && request.status !== "In_Review") {
    throw new Error("تمت معالجة هذا الطلب مسبقاً.");
  }

  if (request.request_type === "Leave") {
    await applyLeaveApproval(request);
  } else if (request.request_type === "Financial") {
    await applyFinancialApproval(request);
  } else {
    await applyGeneralApproval(request);
  }

  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("requests")
    .update({ status: "Approved" })
    .eq("company_id", companyId)
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function rejectEmployeeRequest(requestId) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("requests")
    .update({ status: "Rejected" })
    .eq("company_id", companyId)
    .eq("id", requestId)
    .in("status", ["Pending", "In_Review"])
    .select()
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}
