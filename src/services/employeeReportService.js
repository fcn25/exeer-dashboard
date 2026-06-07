import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId, getEmployeeId } from "../utils/mobileAuth.js";
import { assertEmployeeMonthlyReportRateLimit } from "./aiRateLimitService.js";
import { generatePersonalMentorReportWithGemini } from "./geminiService.js";
import { listAchievementsForEmployee } from "./achievementsService.js";
import { listTasksForEmployee } from "./tasksService.js";
import { formatLocaleDate } from "../i18n/formatLocale.js";

const DONE_STATUSES = new Set([
  "مكتملة",
  "done",
  "completed",
  "complete",
]);

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول reports_archive غير جاهز. نفّذ ملفات الترحيل في Supabase SQL Editor.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

function isCompletedTask(status) {
  const normalized = String(status ?? "").trim().toLowerCase();
  return DONE_STATUSES.has(normalized) || normalized.includes("مكتمل");
}

function formatDateLabel(value) {
  return formatLocaleDate(value, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function fetchEmployeeContext(employeeId) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("employees")
    .select("full_name, job_title_name, department, role")
    .eq("company_id", companyId)
    .eq("id", Number(employeeId))
    .maybeSingle();

  if (error) throw new Error(mapDbError(error));
  return data;
}

function buildEmployeeMetricsPrompt({ employee, tasks, achievements }) {
  const completedTasks = tasks
    .filter((task) => isCompletedTask(task.status))
    .slice(0, 8)
    .map((task, index) => {
      const title = String(task.title ?? task.description ?? "مهمة").trim();
      const deadline = task.deadline ? ` — موعد: ${formatDateLabel(task.deadline)}` : "";
      return `${index + 1}. ${title}${deadline}`;
    });

  const recentAchievements = achievements.slice(0, 6).map((item, index) => {
    const date = formatDateLabel(item.achievement_date);
    return `${index + 1}. ${item.title} (${date}) — ${String(item.description ?? "").trim()}`;
  });

  return [
    `الاسم: ${employee?.full_name ?? "موظف"}`,
    `المسمى الوظيفي: ${employee?.job_title_name ?? "—"}`,
    `القسم: ${employee?.department ?? "—"}`,
    "",
    "المهام المكتملة مؤخراً:",
    completedTasks.length ? completedTasks.join("\n") : "لا توجد مهام مكتملة مسجّلة.",
    "",
    "الإنجازات الأخيرة:",
    recentAchievements.length ? recentAchievements.join("\n") : "لا توجد إنجازات مسجّلة.",
  ].join("\n");
}

export async function listEmployeePersonalReports(employeeId) {
  const companyId = getCompanyId();
  const resolvedEmployeeId = employeeId ?? getEmployeeId();
  if (!resolvedEmployeeId) return [];

  const { data, error } = await supabase
    .from("reports_archive")
    .select("id, report_content, created_at")
    .eq("company_id", companyId)
    .eq("employee_id", Number(resolvedEmployeeId))
    .eq("report_type", "Employee_Monthly")
    .order("created_at", { ascending: false });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function saveEmployeePersonalReport(employeeId, reportContent) {
  const companyId = getCompanyId();
  const resolvedEmployeeId = employeeId ?? getEmployeeId();
  if (!resolvedEmployeeId) throw new Error("تعذّر تحديد حساب الموظف.");

  const { data, error } = await supabase
    .from("reports_archive")
    .insert({
      company_id: companyId,
      employee_id: Number(resolvedEmployeeId),
      report_type: "Employee_Monthly",
      report_content: reportContent,
    })
    .select()
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function generateAndSaveEmployeePersonalReport(employeeId) {
  const resolvedEmployeeId = employeeId ?? getEmployeeId();
  if (!resolvedEmployeeId) throw new Error("تعذّر تحديد حساب الموظف.");

  await assertEmployeeMonthlyReportRateLimit(resolvedEmployeeId);

  const [employee, tasks, achievements] = await Promise.all([
    fetchEmployeeContext(resolvedEmployeeId),
    listTasksForEmployee(resolvedEmployeeId),
    listAchievementsForEmployee(resolvedEmployeeId),
  ]);

  const metricsText = buildEmployeeMetricsPrompt({ employee, tasks, achievements });
  const reportContent = await generatePersonalMentorReportWithGemini(metricsText);
  const record = await saveEmployeePersonalReport(resolvedEmployeeId, reportContent);

  return { record, reportContent, employee };
}
