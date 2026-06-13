import { supabase } from "../utils/supabaseClient.js";

/**
 * Gemini fallback for unmatched free-form queries (rate-limited + logged).
 * @param {{ query: string, employeeId?: number|null }} params
 */
export async function submitAgentQueryFallback({ query, employeeId = null }) {
  const trimmed = String(query ?? "").trim();
  if (!trimmed) throw new Error("Query is required.");

  /** @type {{ query: string, p_employee_id?: number }} */
  const body = { query: trimmed };
  if (employeeId != null && Number.isFinite(Number(employeeId))) {
    body.p_employee_id = Number(employeeId);
  }

  const { data, error } = await supabase.functions.invoke("agent-query", { body });

  if (error) throw new Error(error.message || "تعذّر إرسال الطلب.");
  if (data?.error) throw new Error(String(data.error));
  if (!data?.answer_text && !data?.result_type) {
    throw new Error("تعذّر الحصول على إجابة.");
  }

  return data;
}
