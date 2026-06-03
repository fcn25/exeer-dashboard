import { getEmployeeId } from "../utils/mobileAuth.js";
import { fetchEmployeeProfileById } from "./employeeProfileService.js";
import { listAchievementsForEmployee } from "./achievementsService.js";
import { listTasksForEmployee } from "./tasksService.js";

const PENDING_STATUSES = ["قيد الانتظار", "قيد التنفيذ", "للمراجعة", "pending", "in progress"];

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

  const [tasks, achievements, employee] = await Promise.all([
    listTasksForEmployee(resolvedEmployeeId),
    listAchievementsForEmployee(resolvedEmployeeId),
    fetchEmployeeProfileById(resolvedEmployeeId),
  ]);

  const pendingTasks = tasks.filter((task) => isPendingTask(task.status)).length;
  const leaveBalance =
    employee?.leave_balance != null ? Number(employee.leave_balance) : 0;

  return {
    employee,
    tasks,
    achievements,
    stats: {
      pendingTasks,
      totalAchievements: achievements.length,
      leaveBalance,
    },
  };
}
