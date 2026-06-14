import { supabase } from "../utils/supabaseClient.js";
import { resolveEmployeeContextFromSession } from "./currentEmployeeService.js";

const NOTE_SELECT =
  "id, company_id, employee_id, content, color, is_pinned, created_at, updated_at";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول الملاحظات غير جاهز. نفّذ migration user_quick_notes في Supabase.";
  }
  return error.message || "تعذّر حفظ الملاحظة.";
}

/** @typedef {{ id: number, content: string, authorEmployeeId: number, updatedAt: string, createdAt: string }} WorkspaceNote */

function mapNoteRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    content: String(row.content ?? ""),
    authorEmployeeId: row.employee_id,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

export async function listWorkspaceNotes() {
  const { data, error } = await supabase
    .from("user_quick_notes")
    .select(NOTE_SELECT)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(mapDbError(error));
  return (data ?? []).map(mapNoteRow).filter(Boolean);
}

export async function getWorkspaceNote(noteId) {
  const id = Number(noteId);
  if (!Number.isFinite(id)) throw new Error("معرّف الملاحظة غير صالح.");

  const { data, error } = await supabase
    .from("user_quick_notes")
    .select(NOTE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(mapDbError(error));
  return mapNoteRow(data);
}

export async function createWorkspaceNote({ content }) {
  const { employeeId, companyId } = await resolveEmployeeContextFromSession(
    "حفظ الملاحظة",
  );

  const payload = {
    company_id: companyId,
    employee_id: employeeId,
    content: String(content ?? "").trim(),
    is_pinned: false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_quick_notes")
    .insert(payload)
    .select(NOTE_SELECT)
    .single();

  if (error) throw new Error(mapDbError(error));
  return mapNoteRow(data);
}

export async function updateWorkspaceNote(noteId, { content }) {
  const id = Number(noteId);
  if (!Number.isFinite(id)) throw new Error("معرّف الملاحظة غير صالح.");

  const payload = {
    content: String(content ?? "").trim(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_quick_notes")
    .update(payload)
    .eq("id", id)
    .select(NOTE_SELECT)
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
