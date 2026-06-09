import { supabase } from "../utils/supabaseClient.js";

export function classifyViolation(delayMinutes) {
  if (delayMinutes <= 0) return null;
  if (delayMinutes < 15) return "late_under_15";
  if (delayMinutes < 30) return "late_15_30";
  if (delayMinutes < 60) return "late_30_60";
  return "late_over_60";
}

const DEDUCTION_MATRIX = {
  late_under_15: [
    { type: "warning", value: 0 },
    { type: "percent", value: 5 },
    { type: "percent", value: 10 },
    { type: "percent", value: 20 },
  ],
  late_15_30: [
    { type: "warning", value: 0 },
    { type: "percent", value: 5 },
    { type: "percent", value: 10 },
    { type: "percent", value: 20 },
  ],
  late_30_60: [
    { type: "warning", value: 0 },
    { type: "percent", value: 15 },
    { type: "percent", value: 25 },
    { type: "percent", value: 50 },
  ],
  late_over_60: [
    { type: "day", value: 1 },
    { type: "day", value: 1 },
    { type: "day", value: 2 },
    { type: "day", value: 2 },
  ],
  absent_unauthorized: [
    { type: "day", value: 1 },
    { type: "day", value: 2 },
    { type: "day", value: 3 },
    { type: "day", value: 4 },
  ],
  early_leave: [
    { type: "warning", value: 0 },
    { type: "percent", value: 10 },
    { type: "percent", value: 25 },
    { type: "day", value: 1 },
  ],
};

function getSuggestedDeduction(violationType, occurrenceNumber) {
  const matrix = DEDUCTION_MATRIX[violationType] ?? [];
  const index = Math.min(occurrenceNumber - 1, matrix.length - 1);
  return matrix[index] ?? { type: "warning", value: 0 };
}

export async function getOccurrenceNumber(
  employeeId,
  violationType,
  violationDate,
) {
  const yearStart = `${new Date(violationDate).getFullYear()}-01-01`;

  const { count } = await supabase
    .from("attendance_violations")
    .select("*", { count: "exact", head: true })
    .eq("employee_id", employeeId)
    .eq("violation_type", violationType)
    .gte("violation_date", yearStart)
    .lte("violation_date", violationDate)
    .not("status", "eq", "excuse_accepted");

  return (count ?? 0) + 1;
}

export async function createViolationIfNeeded(
  employeeId,
  companyId,
  delayMinutes,
  punchDate,
) {
  const violationType = classifyViolation(delayMinutes);
  if (!violationType) return null;

  const occurrenceNumber = await getOccurrenceNumber(
    employeeId,
    violationType,
    punchDate,
  );

  const deduction = getSuggestedDeduction(violationType, occurrenceNumber);

  const { data, error } = await supabase
    .from("attendance_violations")
    .insert({
      company_id: companyId,
      employee_id: employeeId,
      violation_date: punchDate,
      violation_type: violationType,
      delay_minutes: delayMinutes,
      occurrence_number: occurrenceNumber,
      suggested_deduction_type: deduction.type,
      suggested_deduction_value: deduction.value,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.warn("Violation creation failed silently:", error.message);
    return null;
  }

  return data;
}

export async function fetchPendingViolations(companyId) {
  const { data, error } = await supabase
    .from("attendance_violations")
    .select(`
      *,
      employees (
        id,
        first_name,
        last_name,
        email,
        job_title,
        employee_number
      )
    `)
    .eq("company_id", companyId)
    .in("status", ["pending", "awaiting_response"])
    .order("violation_date", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function acceptExcuse(violationId, managerNotes = "") {
  const { error } = await supabase
    .from("attendance_violations")
    .update({
      status: "excuse_accepted",
      manager_notes: managerNotes,
    })
    .eq("id", violationId);

  if (error) throw error;
}

export async function confirmPenalty(violationId, managerNotes = "") {
  const { error } = await supabase
    .from("attendance_violations")
    .update({
      status: "penalty_confirmed",
      manager_notes: managerNotes,
    })
    .eq("id", violationId);

  if (error) throw error;
}

export async function logClarificationSent(
  violationId,
  companyId,
  employeeId,
  employeeEmail,
) {
  await supabase
    .from("attendance_violations")
    .update({ status: "awaiting_response" })
    .eq("id", violationId);

  await supabase.from("attendance_clarifications").insert({
    company_id: companyId,
    violation_id: violationId,
    employee_id: employeeId,
    sent_to_email: employeeEmail,
    status: "sent",
  });
}

export async function getEmployeeRiskLevel(employeeId) {
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];

  const { data } = await supabase
    .from("attendance_violations")
    .select("violation_type, violation_date")
    .eq("employee_id", employeeId)
    .gte("violation_date", monthStartStr)
    .not("status", "eq", "excuse_accepted");

  const count = data?.length ?? 0;
  const hasAbsence =
    data?.some((v) => v.violation_type === "absent_unauthorized") ?? false;

  if (count >= 7 || (hasAbsence && count >= 3)) return "critical";
  if (count >= 5 || (hasAbsence && count >= 2)) return "high";
  if (count >= 3) return "medium";
  return "normal";
}

export function buildClarificationMailto(
  employeeEmail,
  employeeName,
  companyName,
  violationType,
  violationDate,
  delayMinutes,
) {
  const typeLabels = {
    late_under_15: "تأخر عن موعد العمل (أقل من 15 دقيقة)",
    late_15_30: "تأخر عن موعد العمل (15-30 دقيقة)",
    late_30_60: "تأخر عن موعد العمل (30-60 دقيقة)",
    late_over_60: "تأخر عن موعد العمل (أكثر من 60 دقيقة)",
    absent_unauthorized: "غياب بدون إذن",
    early_leave: "مغادرة مبكرة",
  };

  const label = typeLabels[violationType] ?? violationType;

  const subject = encodeURIComponent(
    `طلب إفادة — ${label} بتاريخ ${violationDate}`,
  );

  const body = encodeURIComponent(
    `السيد/ة ${employeeName}،

نفيدكم بأنه تم رصد ${label} بتاريخ ${violationDate}${
      delayMinutes > 0 ? ` بمقدار ${delayMinutes} دقيقة` : ""
    }.

وفقاً لنظام العمل السعودي ولوائح الشركة، يُرجى تزويدنا 
بإفادتكم خلال 48 ساعة من استلام هذا البريد.

يمكنكم الرد على هذا البريد مباشرة.

مع التحية،
${companyName}`,
  );

  return `mailto:${employeeEmail}?subject=${subject}&body=${body}`;
}
