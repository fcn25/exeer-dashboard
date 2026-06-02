import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جداول قاعدة البيانات غير جاهزة. نفّذ ملف supabase/migrations/20250602000000_exeer_schema.sql في Supabase SQL Editor.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

export function taskFormToRow(form) {
  const title = String(form.title ?? "").trim();
  const description = String(form.description ?? "").trim();

  return {
    title: title || null,
    description: description || title || "—",
    assigned_to_id: form.assigned_to_id ? Number(form.assigned_to_id) : null,
    assigned_to_name: form.assigned_to_name?.trim() || null,
    deadline: form.due_date || form.deadline || null,
    status: form.status || "قيد الانتظار",
    ai_source: form.ai_source || null,
  };
}

export async function listTasks() {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function listTasksForEmployee(employeeId) {
  const companyId = getCompanyId();
  if (!employeeId) return [];

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("company_id", companyId)
    .eq("assigned_to_id", Number(employeeId))
    .order("created_at", { ascending: false });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function createTask(form) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      company_id: companyId,
      ...taskFormToRow(form),
    })
    .select()
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function updateTaskStatus(taskId, status) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}
