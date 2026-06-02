import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جداول قاعدة البيانات غير جاهزة. نفّذ ملف supabase/migrations/20250602000000_exeer_schema.sql في Supabase SQL Editor.";
  }
  return error.message || "تعذّر جلب البيانات.";
}

async function countRows(table, filter) {
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (filter) query = filter(query);

  const { count, error } = await query;
  if (error) throw new Error(mapDbError(error));
  return count ?? 0;
}

export async function fetchDashboardStats() {
  const companyId = getCompanyId();

  const [employeeCount, pendingTasks, upcomingEvents, pendingRequests] =
    await Promise.all([
      countRows("employees", (q) => q.eq("company_id", companyId)),
      countRows("tasks", (q) =>
        q.eq("company_id", companyId).neq("status", "مكتملة"),
      ),
      countRows("events", (q) =>
        q.eq("company_id", companyId).gte("event_datetime", new Date().toISOString()),
      ),
      countRows("pending_requests", (q) =>
        q.eq("company_id", companyId).eq("status", "معلق"),
      ),
    ]);

  return {
    employeeCount,
    pendingTasks,
    upcomingEvents,
    pendingRequests,
  };
}

export async function fetchPendingRequestsPreview(limit = 5) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("pending_requests")
    .select("id, employee_name, request_type, description, status, created_at")
    .eq("company_id", companyId)
    .eq("status", "معلق")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}
