import { expandTaskBriefWithGemini } from "./geminiService.js";
import { assertSmartTasksRateLimit } from "./aiRateLimitService.js";
import { createTask } from "./tasksService.js";

function buildTaskTitle(brief) {
  const normalized = String(brief ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) return "مهمة ذكية";
  if (normalized.length <= 80) return normalized;
  return `${normalized.slice(0, 77).trim()}…`;
}

export async function generateAndAssignSmartTask({
  employeeId,
  employeeName,
  brief,
}) {
  if (!employeeId) {
    throw new Error("يرجى اختيار الموظف المكلف.");
  }

  await assertSmartTasksRateLimit();

  const description = await expandTaskBriefWithGemini(brief);

  const task = await createTask({
    title: buildTaskTitle(brief),
    description,
    assigned_to_id: employeeId,
    assigned_to_name: employeeName,
    status: "To Do",
    ai_source: "smart_tasks",
  });

  return task;
}
