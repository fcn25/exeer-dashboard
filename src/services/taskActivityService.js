import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId, getEmployeeId } from "../utils/mobileAuth.js";
import {
  TASK_ATTACHMENT_ALLOWED_MIME,
  TASK_ATTACHMENT_MAX_BYTES,
  prepareTaskAttachment,
} from "../utils/taskAttachment.js";

const ACTIVITY_SELECT =
  "id, task_id, company_id, author_employee_id, kind, body, meta, attachment_url, created_at, author:employees!task_activity_author_employee_id_fkey(id, full_name)";

const ACTIVITY_SELECT_PLAIN =
  "id, task_id, company_id, author_employee_id, kind, body, meta, attachment_url, created_at";

const BUCKET = "task-attachments";

export const TASK_ACTIVITY_SCHEMA_HINT =
  "جدول task_activity غير موجود بعد. نفّذ: npm run db:apply-task-activity (أو طبّق supabase/migrations/20250721120000_task_activity.sql في Supabase SQL Editor) ثم NOTIFY pgrst, 'reload schema';";

function isTaskActivityUnavailableError(error) {
  if (!error) return false;
  const code = String(error.code ?? "");
  const message = String(error.message ?? "").toLowerCase();
  return (
    code === "PGRST205" ||
    (message.includes("task_activity") &&
      (message.includes("could not find") ||
        message.includes("does not exist") ||
        message.includes("schema cache")))
  );
}

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (isTaskActivityUnavailableError(error)) return TASK_ACTIVITY_SCHEMA_HINT;
  return error.message || "تعذّر إكمال العملية.";
}

function normalizeActivityRow(row) {
  if (!row || typeof row !== "object") return row;
  const author = row.author ?? null;
  return {
    id: row.id,
    taskId: row.task_id,
    companyId: row.company_id,
    authorEmployeeId: row.author_employee_id,
    authorName: author?.full_name ?? null,
    kind: row.kind,
    body: row.body ?? "",
    meta: row.meta ?? null,
    attachmentUrl: row.attachment_url ?? null,
    createdAt: row.created_at,
  };
}

async function selectActivityRows(buildQuery) {
  const { data, error } = await buildQuery(ACTIVITY_SELECT);
  if (!error) return (data ?? []).map(normalizeActivityRow);

  if (isTaskActivityUnavailableError(error)) {
    throw new Error(mapDbError(error));
  }

  const fallback = await buildQuery(ACTIVITY_SELECT_PLAIN);
  if (fallback.error) throw new Error(mapDbError(fallback.error));
  return (fallback.data ?? []).map(normalizeActivityRow);
}

export async function listTaskActivity(taskId) {
  if (!taskId) return [];

  return selectActivityRows((columns) =>
    supabase
      .from("task_activity")
      .select(columns)
      .eq("task_id", Number(taskId))
      .order("created_at", { ascending: true }),
  );
}

export async function createTaskComment({
  taskId,
  body,
  attachmentUrl = null,
  mentions = [],
}) {
  const employeeId = getEmployeeId();
  if (!employeeId) throw new Error("تعذّر تحديد حساب الموظف الحالي.");
  if (!taskId) throw new Error("معرّف المهمة مطلوب.");

  const trimmedBody = String(body ?? "").trim();
  if (!trimmedBody && !attachmentUrl) {
    throw new Error("أدخل نصاً أو أرفق ملفاً.");
  }

  const uniqueMentions = [
    ...new Set((mentions ?? []).map(Number).filter(Boolean)),
  ];

  const payload = {
    task_id: Number(taskId),
    company_id: getCompanyId(),
    author_employee_id: employeeId,
    kind: "comment",
    body: trimmedBody || null,
    attachment_url: attachmentUrl,
    meta: uniqueMentions.length > 0 ? { mentions: uniqueMentions } : null,
  };

  const { data, error } = await supabase
    .from("task_activity")
    .insert(payload)
    .select(ACTIVITY_SELECT)
    .single();

  if (error) {
    if (isTaskActivityUnavailableError(error)) {
      throw new Error(mapDbError(error));
    }

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("task_activity")
      .insert(payload)
      .select(ACTIVITY_SELECT_PLAIN)
      .single();

    if (fallbackError) throw new Error(mapDbError(fallbackError));
    return normalizeActivityRow(fallbackData);
  }

  return normalizeActivityRow(data);
}

export async function uploadTaskAttachment(file, taskId) {
  if (!file || !taskId) throw new Error("الملف ومعرّف المهمة مطلوبان.");

  const companyId = getCompanyId();
  const employeeId = getEmployeeId();
  if (!companyId || !employeeId) {
    throw new Error("تعذّر تحديد الشركة أو الموظف.");
  }

  const prepared = await prepareTaskAttachment(file);
  if (prepared.size > TASK_ATTACHMENT_MAX_BYTES) {
    throw new Error("الحد الأقصى 1 ميجابايت.");
  }

  const mimeType = String(prepared.type ?? "").toLowerCase();
  if (mimeType && !TASK_ATTACHMENT_ALLOWED_MIME.includes(mimeType)) {
    throw new Error("يُسمح برفع صور (JPEG, PNG, WebP, GIF) أو PDF فقط.");
  }

  const extension = mimeType.includes("pdf")
    ? "pdf"
    : "jpg";
  const timestamp = Date.now();
  const path = `${companyId}/${taskId}/${employeeId}-${timestamp}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, prepared, {
    contentType: prepared.type || "application/octet-stream",
    upsert: false,
  });

  if (error) throw new Error(mapDbError(error));
  return path;
}

export function getTaskAttachmentPublicUrl(path) {
  if (!path) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export function subscribeTaskActivity(taskId, onInsert) {
  if (!taskId || typeof onInsert !== "function") {
    return () => {};
  }

  const channel = supabase
    .channel(`task-activity-${taskId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "task_activity",
        filter: `task_id=eq.${Number(taskId)}`,
      },
      async (payload) => {
        const row = payload?.new;
        if (!row?.id) return;

        try {
          const { data, error } = await supabase
            .from("task_activity")
            .select(ACTIVITY_SELECT)
            .eq("id", row.id)
            .maybeSingle();

          if (error || !data) {
            onInsert(normalizeActivityRow(row));
            return;
          }
          onInsert(normalizeActivityRow(data));
        } catch {
          onInsert(normalizeActivityRow(row));
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export { TASK_ATTACHMENT_MAX_BYTES };
