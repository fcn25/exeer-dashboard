import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import { AiRateLimitError, RATE_LIMIT_MESSAGE } from "../utils/aiRateLimit.js";

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function sinceIsoFromHours(hours) {
  return new Date(Date.now() - hours * MS_PER_HOUR).toISOString();
}

function sinceIsoFromDays(days) {
  return new Date(Date.now() - days * MS_PER_DAY).toISOString();
}

async function countRowsSince(table, companyId, sinceIso, applyFilter) {
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("created_at", sinceIso);

  if (applyFilter) query = applyFilter(query);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function assertUnderLimit(count, max, toolLabel) {
  if (count >= max) {
    throw new AiRateLimitError(RATE_LIMIT_MESSAGE);
  }
  void toolLabel;
}

export async function assertSmartTasksRateLimit() {
  const companyId = getCompanyId();
  const count = await countRowsSince(
    "tasks",
    companyId,
    sinceIsoFromHours(24),
    (query) => query.eq("ai_source", "smart_tasks"),
  );
  await assertUnderLimit(count, 5, "Smart Tasks");
}

export async function assertSmartInterviewsRateLimit() {
  const companyId = getCompanyId();
  const count = await countRowsSince(
    "interview_archive",
    companyId,
    sinceIsoFromHours(24),
  );
  await assertUnderLimit(count, 3, "Smart Interviews");
}

export async function assertSmartGoalsRateLimit() {
  const companyId = getCompanyId();
  const count = await countRowsSince(
    "smart_goals_archive",
    companyId,
    sinceIsoFromHours(24),
  );
  await assertUnderLimit(count, 3, "Smart Goals");
}

export async function assertMonthlyReportRateLimit() {
  const companyId = getCompanyId();
  const count = await countRowsSince(
    "reports_archive",
    companyId,
    sinceIsoFromDays(28),
    (query) => query.eq("report_type", "Monthly"),
  );
  await assertUnderLimit(count, 1, "Monthly Report");
}

export async function assertEmployeeMonthlyReportRateLimit(employeeId) {
  const companyId = getCompanyId();
  const sinceIso = sinceIsoFromDays(28);
  const { count, error } = await supabase
    .from("reports_archive")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("employee_id", Number(employeeId))
    .eq("report_type", "Employee_Monthly")
    .gte("created_at", sinceIso);

  if (error) throw error;
  await assertUnderLimit(count ?? 0, 1, "Employee Monthly Report");
}
