import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import {
  isMissingColumnError,
  SCHEMA_FIX_HINT,
} from "../utils/supabaseErrors.js";

const TASK_SELECT_COLUMNS =
  "id, company_id, title, description, assigned_to_id, assigned_to_name, deadline, status, created_at, updated_at, ai_source";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جداول قاعدة البيانات غير جاهزة. نفّذ ملف supabase/migrations/20250602000000_exeer_schema.sql في Supabase SQL Editor.";
  }
  if (isMissingColumnError(error)) return SCHEMA_FIX_HINT;
  return error.message || "تعذّر إكمال العملية.";
}

export function taskFormToRow(form) {
  const title = String(form.title ?? "").trim();
  const description = String(form.description ?? "").trim();
  const aiSource = String(form.ai_source ?? "").trim();

  const row = {
    title: title || null,
    description: description || title || "—",
    assigned_to_id: form.assigned_to_id ? Number(form.assigned_to_id) : null,
    assigned_to_name: form.assigned_to_name?.trim() || null,
    deadline: form.due_date || form.deadline || null,
    status: form.status || "قيد الانتظار",
  };

  if (aiSource) {
    row.ai_source = aiSource;
  }

  return row;
}

function normalizeTaskRow(row) {
  if (!row || typeof row !== "object") return row;
  return {
    ...row,
    ai_source: row.ai_source ?? null,
  };
}

const TASK_SELECT_FALLBACK =
  "id, company_id, title, description, assigned_to_id, assigned_to_name, deadline, status, created_at, updated_at";

async function runTaskSelect(buildQuery, columns) {
  const { data, error } = await buildQuery(columns);
  return { data, error };
}

async function selectTasks(buildFilteredQuery) {
  let { data, error } = await runTaskSelect(
    buildFilteredQuery,
    TASK_SELECT_COLUMNS,
  );

  if (!error) {
    return (data ?? []).map(normalizeTaskRow);
  }

  if (isMissingColumnError(error)) {
    ({ data, error } = await runTaskSelect(
      buildFilteredQuery,
      TASK_SELECT_FALLBACK,
    ));
    if (!error) return (data ?? []).map(normalizeTaskRow);
  }

  throw new Error(mapDbError(error));
}

export async function listTasks() {
  const companyId = getCompanyId();
  return selectTasks((columns) =>
    supabase
      .from("tasks")
      .select(columns)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
  );
}

export async function listTasksForEmployee(employeeId) {
  const companyId = getCompanyId();
  if (!employeeId) return [];

  return selectTasks((columns) =>
    supabase
      .from("tasks")
      .select(columns)
      .eq("company_id", companyId)
      .eq("assigned_to_id", Number(employeeId))
      .order("created_at", { ascending: false }),
  );
}

export async function createTask(form) {
  const companyId = getCompanyId();
  const payload = {
    company_id: companyId,
    ...taskFormToRow(form),
  };

  let { data, error } = await supabase
    .from("tasks")
    .insert(payload)
    .select(TASK_SELECT_COLUMNS)
    .single();

  if (error && isMissingColumnError(error) && "ai_source" in payload) {
    const { ai_source: _removed, ...withoutAiSource } = payload;
    ({ data, error } = await supabase
      .from("tasks")
      .insert(withoutAiSource)
      .select(
        "id, company_id, title, description, assigned_to_id, assigned_to_name, deadline, status, created_at, updated_at",
      )
      .single());
  }

  if (error) throw new Error(mapDbError(error));
  return normalizeTaskRow(data);
}

export async function updateTaskStatus(taskId, status) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", taskId)
    .select(
      "id, company_id, title, description, assigned_to_id, assigned_to_name, deadline, status, created_at, updated_at",
    )
    .single();

  if (error) throw new Error(mapDbError(error));
  return normalizeTaskRow(data);
}
