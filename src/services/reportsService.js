import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import { assertMonthlyReportRateLimit } from "./aiRateLimitService.js";
import { getCompanyIndustry } from "./companyService.js";
import { generateMonthlyReportWithGemini } from "./geminiService.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول reports_archive غير جاهز. نفّذ ملف supabase/migrations/20250607000000_industry_and_reports.sql في Supabase SQL Editor.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

async function countRows(table, applyFilter) {
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (applyFilter) query = applyFilter(query);

  const { count, error } = await query;
  if (error) throw new Error(mapDbError(error));
  return count ?? 0;
}

export async function fetchMonthlyReportMetrics() {
  const companyId = getCompanyId();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [employeeCount, completedTasks, recentAchievements] = await Promise.all([
    countRows("employees", (q) => q.eq("company_id", companyId)),
    countRows("tasks", (q) =>
      q.eq("company_id", companyId).in("status", ["مكتملة", "Done", "done"]),
    ),
    countRows("employee_achievements", (q) =>
      q.eq("company_id", companyId).gte("achievement_date", thirtyDaysAgo),
    ),
  ]);

  return {
    employeeCount,
    completedTasks,
    recentAchievements,
    periodLabel: "آخر 30 يوماً",
  };
}

export function formatMetricsForPrompt(metrics) {
  return [
    `- عدد الموظفين: ${metrics.employeeCount}`,
    `- المهام المكتملة (Done): ${metrics.completedTasks}`,
    `- الإنجازات المسجّلة (${metrics.periodLabel}): ${metrics.recentAchievements}`,
  ].join("\n");
}

export async function listMonthlyReports() {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("reports_archive")
    .select("id, report_type, report_content, created_at")
    .eq("company_id", companyId)
    .eq("report_type", "Monthly")
    .order("created_at", { ascending: false });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function saveMonthlyReport(reportContent) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("reports_archive")
    .insert({
      company_id: companyId,
      report_type: "Monthly",
      report_content: reportContent,
    })
    .select()
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function generateAndSaveMonthlyReport() {
  await assertMonthlyReportRateLimit();

  const [industry, metrics] = await Promise.all([
    getCompanyIndustry(),
    fetchMonthlyReportMetrics(),
  ]);

  const reportContent = await generateMonthlyReportWithGemini(
    industry,
    formatMetricsForPrompt(metrics),
  );

  const record = await saveMonthlyReport(reportContent);

  return {
    record,
    reportContent,
    industry,
    metrics,
  };
}
