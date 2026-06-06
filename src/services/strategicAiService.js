import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
function mapDbError(error) {
  return error?.message || "تعذّر جلب البيانات.";
}
import { fetchDashboardStats } from "./dashboardService.js";
import {
  fetchMonthlyReportMetrics,
  formatMetricsForPrompt,
} from "./reportsService.js";
import { getCompanyIndustry } from "./companyService.js";
import {
  generateManagementRecommendationsWithGemini,
  generateOrganizationHealthReportWithGemini,
  generatePerformancePredictionsWithGemini,
} from "./geminiService.js";
import { assertMonthlyReportRateLimit } from "./aiRateLimitService.js";

const PERIOD_LABELS = {
  weekly: "أسبوعي",
  monthly: "شهري",
};

async function fetchWeeklyMetrics() {
  const companyId = getCompanyId();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [tasksRes, requestsRes, employeesRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("created_at", since),
    supabase
      .from("pending_requests")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("created_at", since),
    supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
  ]);

  if (tasksRes.error) throw new Error(mapDbError(tasksRes.error));
  if (requestsRes.error) throw new Error(mapDbError(requestsRes.error));
  if (employeesRes.error) throw new Error(mapDbError(employeesRes.error));

  return {
    periodDays: 7,
    newTasks: tasksRes.count ?? 0,
    newRequests: requestsRes.count ?? 0,
    totalEmployees: employeesRes.count ?? 0,
  };
}

function formatWeeklyMetrics(metrics) {
  return [
    `الفترة: آخر ${metrics.periodDays} أيام`,
    `مهام جديدة: ${metrics.newTasks}`,
    `طلبات جديدة: ${metrics.newRequests}`,
    `إجمالي الموظفين: ${metrics.totalEmployees}`,
  ].join("\n");
}

async function buildStrategicContext(period = "monthly") {
  const [stats, industry, monthlyMetrics] = await Promise.all([
    fetchDashboardStats(),
    getCompanyIndustry(),
    fetchMonthlyReportMetrics(),
  ]);

  const weeklyMetrics =
    period === "weekly" ? await fetchWeeklyMetrics() : null;

  const lines = [
    "مؤشرات لوحة التحكم:",
    `- الموظفون: ${stats.employeeCount ?? 0}`,
    `- المهام المعلقة: ${stats.pendingTasks ?? 0}`,
    `- الطلبات المعلقة: ${stats.pendingRequests ?? 0}`,
    `- الفعاليات القادمة: ${stats.upcomingEvents ?? 0}`,
    "",
    "مؤشرات آخر 30 يوماً:",
    formatMetricsForPrompt(monthlyMetrics),
  ];

  if (weeklyMetrics) {
    lines.push("", "مؤشرات أسبوعية:", formatWeeklyMetrics(weeklyMetrics));
  }

  return {
    industry,
    contextText: lines.join("\n"),
    periodLabel: PERIOD_LABELS[period] ?? PERIOD_LABELS.monthly,
  };
}

export async function generateExecutiveHealthReport(period = "monthly") {
  await assertMonthlyReportRateLimit();

  const { industry, contextText, periodLabel } =
    await buildStrategicContext(period);

  const content = await generateOrganizationHealthReportWithGemini(
    industry,
    contextText,
    periodLabel,
  );

  return { content, periodLabel, industry };
}

export async function generatePerformancePredictionsReport() {
  const { contextText } = await buildStrategicContext("monthly");

  const content = await generatePerformancePredictionsWithGemini(contextText);

  return { content };
}

export async function generateManagementRecommendationsReport() {
  const { contextText } = await buildStrategicContext("monthly");

  const content =
    await generateManagementRecommendationsWithGemini(contextText);

  return { content };
}

export const STRATEGIC_AI_TOOLS = [
  {
    id: "executive-health",
    title: "الملخص التنفيذي",
    subtitle: "صحة المنشأة أسبوعياً أو شهرياً",
    description: "تقرير ذكي يلخص مؤشرات الصحة التشغيلية للمنشأة.",
    supportsPeriod: true,
  },
  {
    id: "performance-predictions",
    title: "تنبؤات الأداء",
    subtitle: "اختناقات ومؤشرات الأداء",
    description: "تحليل تنبؤي للاختناقات والأداء المرتفع والمناطق التي تحتاج متابعة.",
    supportsPeriod: false,
  },
  {
    id: "management-recommendations",
    title: "توصيات إدارية استباقية",
    subtitle: "إجراءات موصى بها للإدارة",
    description: "نصائح عملية مرتبة حسب الأولوية لدعم قراراتك الإدارية.",
    supportsPeriod: false,
  },
];
