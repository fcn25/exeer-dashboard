import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول employee_achievements غير جاهز. نفّذ ملف supabase/migrations/20250606000000_employee_achievements.sql في Supabase SQL Editor.";
  }
  if (error.code === "PGRST200") {
    return "تعذّر ربط الإنجازات بالموظفين. تأكد من وجود Foreign Key على employee_id ثم حدّث Schema Cache في Supabase.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

export async function createEmployeeAchievement({
  employeeId,
  title,
  description,
  achievementDate,
}) {
  const companyId = getCompanyId();
  const trimmedTitle = String(title ?? "").trim();
  const trimmedDescription = String(description ?? "").trim();

  if (!employeeId) throw new Error("معرّف الموظف مطلوب.");
  if (!trimmedTitle) throw new Error("عنوان الإنجاز مطلوب.");
  if (!achievementDate) throw new Error("تاريخ الإنجاز مطلوب.");

  const { data, error } = await supabase
    .from("employee_achievements")
    .insert({
      company_id: companyId,
      employee_id: Number(employeeId),
      title: trimmedTitle,
      description: trimmedDescription,
      achievement_date: achievementDate,
    })
    .select()
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function listEmployeeAchievementsWithEmployees() {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("employee_achievements")
    .select(
      "id, title, description, achievement_date, created_at, employee_id, employees ( id, full_name )",
    )
    .eq("company_id", companyId)
    .order("achievement_date", { ascending: false });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

const TASK_ACHIEVEMENT_MARKER_PREFIX = "source_task_id:";

function taskAchievementMarker(taskId) {
  return `${TASK_ACHIEVEMENT_MARKER_PREFIX}${taskId}`;
}

export async function createAchievementFromCompletedTask({ task, employeeId }) {
  const companyId = getCompanyId();
  const resolvedEmployeeId = Number(employeeId);
  const marker = taskAchievementMarker(task.id);

  const { data: existing, error: lookupError } = await supabase
    .from("employee_achievements")
    .select("id, title, description, achievement_date, created_at")
    .eq("company_id", companyId)
    .eq("employee_id", resolvedEmployeeId)
    .like("description", `%${marker}%`)
    .maybeSingle();

  if (lookupError) throw new Error(mapDbError(lookupError));
  if (existing) return existing;

  const taskTitle = String(task.title ?? "").trim() || "مهمة";
  const taskDescription = String(task.description ?? "").trim();
  const today = new Date();
  const achievementDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return createEmployeeAchievement({
    employeeId: resolvedEmployeeId,
    title: `إنجاز: ${taskTitle}`,
    description: [
      marker,
      "أُنجزت المهمة وأُرسلت للمراجعة.",
      taskDescription && taskDescription !== taskTitle ? taskDescription : "",
    ]
      .filter(Boolean)
      .join("\n"),
    achievementDate,
  });
}

export async function listAchievementsForEmployee(employeeId) {
  const companyId = getCompanyId();
  if (!employeeId) return [];

  const { data, error } = await supabase
    .from("employee_achievements")
    .select("id, title, description, achievement_date, created_at")
    .eq("company_id", companyId)
    .eq("employee_id", Number(employeeId))
    .order("achievement_date", { ascending: false });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}
