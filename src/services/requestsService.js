import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId, getEmployeeId } from "../utils/mobileAuth.js";

const MAX_ATTACHMENT_BYTES = 1048576;
const BUCKET = "request-attachments";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول requests غير جاهز. نفّذ ملف supabase/migrations/20250609000000_employee_requests.sql في Supabase SQL Editor.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

export const REQUEST_TYPE_OPTIONS = [
  { value: "Financial", label: "سلفة / طلب مالي" },
  { value: "Leave", label: "إجازة" },
  { value: "General", label: "طلب عام" },
];

export const REQUEST_STATUS_LABELS = {
  Pending: "قيد المراجعة",
  In_Review: "قيد المعالجة",
  Approved: "مقبول",
  Rejected: "مرفوض",
};

export const ROUTING_LABELS = {
  HR_Manager: "مدير الموارد البشرية",
  Direct_Manager: "المدير المباشر",
};

export function resolveRoutingForType() {
  return "Direct_Manager";
}

export function calculateMonthlyDeduction(amount, installments) {
  const numericAmount = Number(amount);
  const numericInstallments = Number(installments);
  if (
    !Number.isFinite(numericAmount) ||
    !Number.isFinite(numericInstallments) ||
    numericInstallments <= 0
  ) {
    return null;
  }
  return Math.round((numericAmount / numericInstallments) * 100) / 100;
}

export async function uploadRequestAttachment(file, employeeId) {
  if (!file) return null;
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("حجم الملف يتجاوز 1 ميغابايت. يرجى اختيار ملف أصغر.");
  }

  const companyId = getCompanyId();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${companyId}/${employeeId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw new Error(error.message || "تعذّر رفع المرفق.");

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export async function createEmployeeRequest({
  requestType,
  details,
  amount,
  installments,
  monthlyDeduction,
  attachmentUrl,
  employeeId,
  leaveType,
  leaveDays,
  startDate,
}) {
  const companyId = getCompanyId();
  const resolvedEmployeeId = employeeId ?? getEmployeeId();
  const trimmedDetails = String(details ?? "").trim();
  const routingTo = resolveRoutingForType(requestType);

  if (!resolvedEmployeeId) throw new Error("تعذّر تحديد حساب الموظف.");
  if (!requestType) throw new Error("نوع الطلب مطلوب.");
  if (!trimmedDetails) throw new Error("تفاصيل الطلب مطلوبة.");

  if (requestType === "Financial") {
    if (!amount || Number(amount) <= 0) {
      throw new Error("المبلغ مطلوب للطلبات المالية.");
    }
    if (!installments || Number(installments) <= 0) {
      throw new Error("عدد الأقساط مطلوب للطلبات المالية.");
    }
    if (!startDate) {
      throw new Error("تاريخ بداية الخصم مطلوب للسلفة.");
    }
  }

  if (requestType === "Leave") {
    if (!leaveType) {
      throw new Error("نوع الإجازة مطلوب.");
    }
    if (!leaveDays || Number(leaveDays) <= 0) {
      throw new Error("عدد أيام الإجازة مطلوب.");
    }
    if (!startDate) {
      throw new Error("تاريخ بداية الإجازة مطلوب.");
    }
  }

  const payload = {
    company_id: companyId,
    employee_id: Number(resolvedEmployeeId),
    request_type: requestType,
    details: trimmedDetails,
    routing_to: routingTo,
    status: "Pending",
    attachment_url: attachmentUrl || null,
    amount: requestType === "Financial" ? Number(amount) : null,
    installments: requestType === "Financial" ? Number(installments) : null,
    monthly_deduction:
      requestType === "Financial"
        ? monthlyDeduction ?? calculateMonthlyDeduction(amount, installments)
        : null,
    leave_type: requestType === "Leave" ? String(leaveType).trim() : null,
    leave_days: requestType === "Leave" ? Number(leaveDays) : null,
    start_date: startDate || null,
  };

  const { data, error } = await supabase
    .from("requests")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}

const PENDING_REQUEST_STATUSES = ["Pending", "In_Review"];

export async function listCompanyRequests({
  limit = 50,
  statuses = PENDING_REQUEST_STATUSES,
} = {}) {
  const companyId = getCompanyId();

  let query = supabase
    .from("requests")
    .select(
      "id, request_type, status, created_at, employee_id, employees ( full_name )",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (statuses?.length) {
    query = query.in("status", statuses);
  }
  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function countCompanyRequests({
  statuses = PENDING_REQUEST_STATUSES,
  requestType = null,
} = {}) {
  const companyId = getCompanyId();

  let query = supabase
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (statuses?.length) {
    query = query.in("status", statuses);
  }
  if (requestType) {
    query = query.eq("request_type", requestType);
  }

  const { count, error } = await query;
  if (error) throw new Error(mapDbError(error));
  return count ?? 0;
}

export async function listManagerPendingRequests({ employeeIds = [], limit = 8 } = {}) {
  const companyId = getCompanyId();
  const ids = [...new Set(employeeIds.map((id) => Number(id)).filter(Boolean))];
  if (!ids.length) return [];

  let query = supabase
    .from("requests")
    .select(
      "id, employee_id, request_type, details, status, routing_to, amount, installments, monthly_deduction, leave_type, leave_days, start_date, created_at, employees ( full_name )",
    )
    .eq("company_id", companyId)
    .eq("routing_to", "Direct_Manager")
    .eq("status", "Pending")
    .in("employee_id", ids)
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function listEmployeeRequests(employeeId) {
  const companyId = getCompanyId();
  const resolvedEmployeeId = employeeId ?? getEmployeeId();
  if (!resolvedEmployeeId) return [];

  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("company_id", companyId)
    .eq("employee_id", Number(resolvedEmployeeId))
    .order("created_at", { ascending: false });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

function mapLegacyDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول pending_requests غير جاهز. نفّذ ملف supabase/migrations/20250602000000_exeer_schema.sql في Supabase SQL Editor.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

/** Legacy mobile dashboard — pending_requests table */
export async function listPendingRequests() {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("pending_requests")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "معلق")
    .order("created_at", { ascending: false });

  if (error) throw new Error(mapLegacyDbError(error));
  return data ?? [];
}

export async function updateRequestStatus(requestId, status) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("pending_requests")
    .update({ status })
    .eq("company_id", companyId)
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw new Error(mapLegacyDbError(error));
  return data;
}
