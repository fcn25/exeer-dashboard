import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId, getEmployeeId } from "../utils/mobileAuth.js";

const ACTIVITY_SELECT =
  "id, task_id, company_id, author_employee_id, kind, body, meta, attachment_url, created_at, author:employees!task_activity_author_employee_id_fkey(id, full_name)";

const BUCKET = "task-attachments";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
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

export async function listTaskActivity(taskId) {
  if (!taskId) return [];

  const { data, error } = await supabase
    .from("task_activity")
    .select(ACTIVITY_SELECT)
    .eq("task_id", Number(taskId))
    .order("created_at", { ascending: true });

  if (error) throw new Error(mapDbError(error));
  return (data ?? []).map(normalizeActivityRow);
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

  if (error) throw new Error(mapDbError(error));
  return normalizeActivityRow(data);
}

export async function uploadTaskAttachment(file, taskId) {
  if (!file || !taskId) throw new Error("الملف ومعرّف المهمة مطلوبان.");

  const companyId = getCompanyId();
  const employeeId = getEmployeeId();
  if (!companyId || !employeeId) {
    throw new Error("تعذّر تحديد الشركة أو الموظف.");
  }

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("حجم الملف يتجاوز 5 ميجابايت.");
  }

  const extension = String(file.name ?? "")
    .split(".")
    .pop()
    ?.toLowerCase()
    ?.replace(/[^a-z0-9]/g, "") || "bin";
  const timestamp = Date.now();
  const path = `${companyId}/${taskId}/${employeeId}-${timestamp}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
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
