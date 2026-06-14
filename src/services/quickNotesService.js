import { supabase } from "../utils/supabaseClient.js";
import { resolveEmployeeContextFromSession } from "./currentEmployeeService.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول الملاحظات غير جاهز. نفّذ migration user_quick_notes في Supabase.";
  }
  return error.message || "تعذّر حفظ الملاحظة.";
}

function mapNoteRow(row) {
  if (!row) return null;
  const related = row.related_employee;
  return {
    id: row.id,
    title: String(row.title ?? "").trim(),
    content: String(row.content ?? ""),
    relatedEmployeeId: row.related_employee_id ?? null,
    relatedDepartment:
      String(row.related_department ?? "").trim() ||
      String(related?.department ?? "").trim() ||
      "",
    relatedEmployeeName: String(related?.full_name ?? "").trim(),
    authorEmployeeId: row.employee_id,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

export async function listWorkspaceNotes() {
  const { data, error } = await supabase
    .from("user_quick_notes")
    .select(
      "id, title, content, related_employee_id, related_department, employee_id, created_at, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) throw new Error(mapDbError(error));

  const rows = data ?? [];
  const relatedIds = [
    ...new Set(
      rows
        .map((row) => row.related_employee_id)
        .filter((id) => id != null)
        .map(Number),
    ),
  ];

  let relatedById = new Map();
  if (relatedIds.length > 0) {
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("id, full_name, department")
      .in("id", relatedIds);

    if (!employeesError) {
      relatedById = new Map(
        (employees ?? []).map((employee) => [Number(employee.id), employee]),
      );
    }
  }

  return rows.map((row) =>
    mapNoteRow({
      ...row,
      related_employee: relatedById.get(Number(row.related_employee_id)) ?? null,
    }),
  );
}

export async function getWorkspaceNote(noteId) {
  const id = Number(noteId);
  if (!Number.isFinite(id)) throw new Error("معرّف الملاحظة غير صالح.");

  const { data, error } = await supabase
    .from("user_quick_notes")
    .select(
      "id, title, content, related_employee_id, related_department, employee_id, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(mapDbError(error));
  if (!data) return null;

  let relatedEmployee = null;
  if (data.related_employee_id) {
    const { data: employee } = await supabase
      .from("employees")
      .select("id, full_name, department")
      .eq("id", data.related_employee_id)
      .maybeSingle();
    relatedEmployee = employee;
  }

  return mapNoteRow({ ...data, related_employee: relatedEmployee });
}

export async function createWorkspaceNote({
  title,
  content,
  relatedEmployeeId,
  relatedDepartment,
}) {
  const { employeeId, companyId } = await resolveEmployeeContextFromSession(
    "حفظ الملاحظة",
  );

  const payload = {
    company_id: companyId,
    employee_id: employeeId,
    title: String(title ?? "").trim() || null,
    content: String(content ?? "").trim(),
    related_employee_id: relatedEmployeeId ? Number(relatedEmployeeId) : null,
    related_department: String(relatedDepartment ?? "").trim() || null,
    is_pinned: false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_quick_notes")
    .insert(payload)
    .select(
      "id, title, content, related_employee_id, related_department, employee_id, created_at, updated_at",
    )
    .single();

  if (error) throw new Error(mapDbError(error));
  return mapNoteRow(data);
}

export async function updateWorkspaceNote(
  noteId,
  { title, content, relatedEmployeeId, relatedDepartment },
) {
  const id = Number(noteId);
  if (!Number.isFinite(id)) throw new Error("معرّف الملاحظة غير صالح.");

  const payload = {
    title: String(title ?? "").trim() || null,
    content: String(content ?? "").trim(),
    related_employee_id: relatedEmployeeId ? Number(relatedEmployeeId) : null,
    related_department: String(relatedDepartment ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_quick_notes")
    .update(payload)
    .eq("id", id)
    .select(
      "id, title, content, related_employee_id, related_department, employee_id, created_at, updated_at",
    )
    .single();

  if (error) throw new Error(mapDbError(error));
  return mapNoteRow(data);
}

export async function deleteWorkspaceNote(noteId) {
  const id = Number(noteId);
  if (!Number.isFinite(id)) throw new Error("معرّف الملاحظة غير صالح.");

  const { error } = await supabase.from("user_quick_notes").delete().eq("id", id);
  if (error) throw new Error(mapDbError(error));
}

/** @deprecated Use listWorkspaceNotes */
export async function getMyQuickNote() {
  const notes = await listWorkspaceNotes();
  return notes[0] ?? null;
}
