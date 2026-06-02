import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId, getEmployeeId } from "../utils/mobileAuth.js";
import { listAchievementsForEmployee } from "./achievementsService.js";
import { listTasksForEmployee } from "./tasksService.js";

const PENDING_STATUSES = ["قيد الانتظار", "قيد التنفيذ", "للمراجعة", "pending", "in progress"];

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  return error.message || "تعذّر تحميل بيانات البوابة.";
}

function isPendingTask(status) {
  const normalized = String(status ?? "").trim().toLowerCase();
  return PENDING_STATUSES.some(
    (value) => normalized === value.toLowerCase() || normalized.includes(value.toLowerCase()),
  );
}

export async function fetchPortalSnapshot(employeeId) {
  const resolvedEmployeeId = employeeId ?? getEmployeeId();
  if (!resolvedEmployeeId) {
    throw new Error("لم يتم ربط حسابك بسجل موظف. تواصل مع الموارد البشرية.");
  }

  const companyId = getCompanyId();

  const [tasks, achievements, employeeRow] = await Promise.all([
    listTasksForEmployee(resolvedEmployeeId),
    listAchievementsForEmployee(resolvedEmployeeId),
    supabase
      .from("employees")
      .select("full_name, job_title_name, department, image")
      .eq("company_id", companyId)
      .eq("id", Number(resolvedEmployeeId))
      .maybeSingle(),
  ]);

  if (employeeRow.error) throw new Error(mapDbError(employeeRow.error));

  const pendingTasks = tasks.filter((task) => isPendingTask(task.status)).length;

  return {
    employee: employeeRow.data,
    tasks,
    achievements,
    stats: {
      pendingTasks,
      totalAchievements: achievements.length,
      leaveBalance: null,
    },
  };
}
