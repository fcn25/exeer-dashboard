import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCorsPreflight, jsonResponse } from "../_shared/cors.ts";

const DELETION_GRACE_DAYS = 30;
/** ~100 years — keeps auth user row for recovery; unban via admin during grace period. */
const AUTH_BAN_DURATION = "876000h";

type EmployeeRow = {
  id: number;
  company_id: number;
  full_name: string | null;
  role: string | null;
  auth_user_id: string | null;
  is_active: boolean | null;
  deletion_requested_at: string | null;
};

function isOwnerRole(role: string | null | undefined): boolean {
  const normalized = String(role ?? "").trim();
  return normalized === "owner" || normalized === "Admin" || normalized === "admin";
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

async function resolveEmployee(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<EmployeeRow | null> {
  const { data, error } = await adminClient
    .from("employees")
    .select(
      "id, company_id, full_name, role, auth_user_id, is_active, deletion_requested_at",
    )
    .eq("auth_user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as EmployeeRow | null;
}

async function findCompanyOwnerAuthUserId(
  adminClient: ReturnType<typeof createClient>,
  companyId: number,
  excludeEmployeeId: number,
): Promise<string | null> {
  const { data, error } = await adminClient
    .from("employees")
    .select("auth_user_id")
    .eq("company_id", companyId)
    .in("role", ["owner", "Admin", "admin"])
    .eq("is_active", true)
    .neq("id", excludeEmployeeId)
    .not("auth_user_id", "is", null)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.auth_user_id as string | null) ?? null;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Server configuration error." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const employee = await resolveEmployee(adminClient, user.id);
    if (!employee) {
      return jsonResponse(
        { error: "لم يتم العثور على سجل موظف مرتبط بهذا الحساب." },
        404,
      );
    }

    if (employee.deletion_requested_at) {
      return jsonResponse(
        { error: "يوجد طلب حذف حساب قيد المعالجة بالفعل." },
        409,
      );
    }

    if (employee.is_active === false) {
      return jsonResponse({ error: "هذا الحساب معطّل بالفعل." }, 409);
    }

    const nowIso = new Date().toISOString();
    const purgeAt = addDaysIso(DELETION_GRACE_DAYS);
    const isOwner = isOwnerRole(employee.role);
    const scope = isOwner ? "company" : "employee";
    const employeeName = String(employee.full_name ?? "موظف").trim() || "موظف";

    const { error: employeeUpdateError } = await adminClient
      .from("employees")
      .update({
        is_active: false,
        deletion_requested_at: nowIso,
        deletion_scheduled_purge_at: purgeAt,
        deleted_by: employee.id,
        employment_status: "مطلوب الحذف",
        updated_at: nowIso,
      })
      .eq("id", employee.id);

    if (employeeUpdateError) throw employeeUpdateError;

    if (isOwner) {
      const { error: companyUpdateError } = await adminClient
        .from("companies")
        .update({
          deletion_requested_at: nowIso,
          deletion_scheduled_purge_at: purgeAt,
        })
        .eq("id", employee.company_id);

      if (companyUpdateError) throw companyUpdateError;
    }

    const { error: requestInsertError } = await adminClient
      .from("account_deletion_requests")
      .insert({
        user_id: user.id,
        employee_id: employee.id,
        company_id: employee.company_id,
        scope,
        status: "pending",
        requested_at: nowIso,
      });

    if (requestInsertError) {
      if (requestInsertError.code === "23505") {
        return jsonResponse(
          { error: "يوجد طلب حذف حساب قيد المعالجة بالفعل." },
          409,
        );
      }
      throw requestInsertError;
    }

    const { error: banError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { ban_duration: AUTH_BAN_DURATION },
    );

    if (banError) throw banError;

    if (!isOwner) {
      const ownerAuthUserId = await findCompanyOwnerAuthUserId(
        adminClient,
        employee.company_id,
        employee.id,
      );

      if (ownerAuthUserId) {
        const { error: notifyError } = await adminClient
          .from("notifications")
          .insert({
            user_id: ownerAuthUserId,
            title: "طلب حذف حساب موظف",
            message: `الموظف ${employeeName} طلب حذف حسابه، لديه 30 يوماً لاستعادته.`,
            type: "account_deletion_request",
          });

        if (notifyError) {
          console.error("Owner notification failed:", notifyError.message);
        }
      }
    }

    const message = isOwner
      ? "تم استلام طلب حذف حسابك. سيتم إزالة منشأتك وبياناتها بالكامل بعد 30 يوماً."
      : "تم استلام طلب حذف حسابك. سيُزال حسابك بالكامل بعد 30 يوماً.";

    return jsonResponse({
      ok: true,
      scope,
      deletion_scheduled_purge_at: purgeAt,
      message,
    });
  } catch (error) {
    console.error("request-account-deletion error:", error);
    const message =
      error instanceof Error ? error.message : "تعذّر تسجيل طلب حذف الحساب.";
    return jsonResponse({ error: message }, 500);
  }
});
