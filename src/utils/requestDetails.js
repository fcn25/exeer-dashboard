import { REQUEST_TYPE_OPTIONS } from "../services/requestsService.js";

const UNPAID_LEAVE_MARKERS = ["بدون راتب", "غير مدفوعة", "غير مدفوع"];

export function resolveRequestTypeLabel(requestType) {
  return (
    REQUEST_TYPE_OPTIONS.find((item) => item.value === requestType)?.label ??
    requestType ??
    "طلب"
  );
}

export function parseLeaveTypeFromDetails(details) {
  const match = String(details ?? "").match(/نوع الإجازة:\s*(.+)/);
  return match?.[1]?.split("\n")[0]?.trim() ?? "";
}

export function shouldDeductLeaveBalance(leaveTypeName) {
  const normalized = String(leaveTypeName ?? "").trim().toLowerCase();
  if (!normalized) return true;
  return !UNPAID_LEAVE_MARKERS.some((marker) => normalized.includes(marker));
}

export function buildRequestSummary(request) {
  if (!request) return "";

  const lines = [String(request.details ?? "").trim()].filter(Boolean);

  if (request.request_type === "Leave") {
    const leaveType = request.leave_type || parseLeaveTypeFromDetails(request.details);
    if (leaveType) lines.unshift(`نوع الإجازة: ${leaveType}`);
    if (request.leave_days != null) {
      lines.push(`المدة: ${request.leave_days} يوم`);
    }
    if (request.start_date) lines.push(`تاريخ البداية: ${request.start_date}`);
  }

  if (request.request_type === "Financial") {
    if (request.amount != null) lines.push(`المبلغ: ${request.amount} ر.س`);
    if (request.installments != null) {
      lines.push(`عدد الأقساط: ${request.installments}`);
    }
    if (request.monthly_deduction != null) {
      lines.push(`القسط الشهري: ${request.monthly_deduction} ر.س`);
    }
    if (request.start_date) {
      lines.push(`بداية الخصم: ${request.start_date}`);
    }
  }

  return lines.join("\n");
}
