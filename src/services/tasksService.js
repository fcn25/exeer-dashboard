import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import {
  isMissingColumnError,
  SCHEMA_FIX_HINT,
} from "../utils/supabaseErrors.js";

const TASK_SELECT_FULL =
  "id, company_id, title, description, assigned_to_id, assigned_to_name, deadline, status, created_at, updated_at, ai_source";

const TASK_SELECT_NO_AI =
  "id, company_id, title, description, assigned_to_id, assigned_to_name, deadline, status, created_at, updated_at";

const TASK_SELECT_NO_TITLE =
  "id, company_id, description, assigned_to_id, assigned_to_name, deadline, status, created_at, updated_at";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جداول قاعدة البيانات غير جاهزة. نفّذ ملف supabase/migrations/20250602000000_exeer_schema.sql في Supabase SQL Editor.";
  }
  if (isMissingColumnError(error)) return SCHEMA_FIX_HINT;
  return error.message || "تعذّر إكمال العملية.";
}

function mergeTitleIntoDescription(title, description) {
  const trimmedTitle = String(title ?? "").trim();
  const trimmedDescription = String(description ?? "").trim();
  if (!trimmedTitle) return trimmedDescription || "—";
  if (!trimmedDescription || trimmedDescription === trimmedTitle) {
    return trimmedTitle;
  }
  return `${trimmedTitle}\n${trimmedDescription}`;
}

export function taskFormToRow(form) {
  const title = String(form.title ?? "").trim();
  const description = String(form.description ?? "").trim();
  const aiSource = String(form.ai_source ?? "").trim();

  const row = {
    description: description || title || "—",
    assigned_to_id: form.assigned_to_id ? Number(form.assigned_to_id) : null,
    assigned_to_name: form.assigned_to_name?.trim() || null,
    deadline: form.due_date || form.deadline || null,
    status: form.status || "قيد الانتظار",
  };

  if (title) {
    row.title = title;
  }

  if (aiSource) {
    row.ai_source = aiSource;
  }

  return row;
}

function normalizeTaskRow(row) {
  if (!row || typeof row !== "object") return row;
  const description = String(row.description ?? "").trim();
  const title =
    String(row.title ?? "").trim() || description.split("\n")[0]?.slice(0, 120) || "مهمة";

  return {
    ...row,
    title,
    description: description || title,
    ai_source: row.ai_source ?? null,
  };
}

function stripOptionalTaskColumns(payload, { dropTitle = false, dropAiSource = false } = {}) {
  const next = { ...payload };
  if (dropTitle) {
    const title = next.title;
    delete next.title;
    next.description = mergeTitleIntoDescription(title, next.description);
  }
  if (dropAiSource) {
    delete next.ai_source;
  }
  return next;
}

async function runTaskSelect(buildQuery, columns) {
  const { data, error } = await buildQuery(columns);
  return { data, error };
}

async function selectTasks(buildFilteredQuery) {
  const attempts = [TASK_SELECT_FULL, TASK_SELECT_NO_AI, TASK_SELECT_NO_TITLE];
  let lastError = null;

  for (const columns of attempts) {
    const { data, error } = await runTaskSelect(buildFilteredQuery, columns);
    if (!error) {
      return (data ?? []).map(normalizeTaskRow);
    }
    if (!isMissingColumnError(error)) {
      throw new Error(mapDbError(error));
    }
    lastError = error;
  }

  throw new Error(mapDbError(lastError));
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

async function insertTaskWithFallbacks(payload) {
  const attempts = [
    { payload, select: TASK_SELECT_FULL },
    {
      payload: stripOptionalTaskColumns(payload, { dropAiSource: true }),
      select: TASK_SELECT_NO_AI,
    },
    {
      payload: stripOptionalTaskColumns(payload, {
        dropAiSource: true,
        dropTitle: true,
      }),
      select: TASK_SELECT_NO_TITLE,
    },
  ];

  let lastError = null;

  for (const attempt of attempts) {
    const { data, error } = await supabase
      .from("tasks")
      .insert(attempt.payload)
      .select(attempt.select)
      .single();

    if (!error) {
      return normalizeTaskRow(data);
    }
    if (!isMissingColumnError(error)) {
      throw new Error(mapDbError(error));
    }
    lastError = error;
  }

  throw new Error(mapDbError(lastError));
}

export async function createTask(form) {
  const companyId = getCompanyId();
  const payload = {
    company_id: companyId,
    ...taskFormToRow(form),
  };

  return insertTaskWithFallbacks(payload);
}

export async function updateTaskStatus(taskId, status) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", taskId)
    .select(TASK_SELECT_NO_AI)
    .single();

  if (error && isMissingColumnError(error)) {
    const { data: fallback, error: fallbackError } = await supabase
      .from("tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("company_id", companyId)
      .eq("id", taskId)
      .select(TASK_SELECT_NO_TITLE)
      .single();

    if (fallbackError) throw new Error(mapDbError(fallbackError));
    return normalizeTaskRow(fallback);
  }

  if (error) throw new Error(mapDbError(error));
  return normalizeTaskRow(data);
}
