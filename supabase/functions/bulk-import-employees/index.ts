import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MANAGEMENT_ROLES = new Set([
  "owner",
  "Admin",
  "Executive",
  "HR_Manager",
  "HR_Assistant",
  "Direct_Manager",
]);

const ALLOWED_EMPLOYEE_ROLES = new Set([
  "owner",
  "Executive",
  "HR_Manager",
  "HR_Assistant",
  "Direct_Manager",
  "Employee",
]);

type ImportRow = {
  full_name?: string;
  email?: string | null;
  phone_number?: string | null;
  department?: string | null;
  job_title_name?: string | null;
  employee_number?: string | null;
  role?: string | null;
  employment_status?: string | null;
  contract_type?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  nationality?: string | null;
  id_number?: number | null;
  national_address?: string | null;
  hire_date?: string | null;
  iban?: string | null;
  leave_balance?: number | null;
  work_location_name?: string | null;
  direct_manager_name?: string | null;
  basic_salary?: number | null;
  housing_allowance?: number | null;
  other_allowance?: number | null;
};

function normalizeImportRole(role: unknown) {
  const raw = String(role ?? "").trim();
  if (!raw) return "Employee";

  const lower = raw.toLowerCase();
  if (lower === "manager" || lower === "department head") {
    return "Direct_Manager";
  }
  if (lower === "admin") return "owner";

  if (ALLOWED_EMPLOYEE_ROLES.has(raw)) return raw;

  return "Employee";
}

async function resolveWorkLocationId(
  adminClient: ReturnType<typeof createClient>,
  companyId: number,
  workLocationName: unknown,
) {
  const name = String(workLocationName ?? "").trim();
  if (!name) return null;

  const { data, error } = await adminClient
    .from("company_branches")
    .select("id, name")
    .eq("company_id", companyId);

  if (error) return null;

  const match = (data ?? []).find(
    (branch) => String(branch.name ?? "").trim().toLowerCase() === name.toLowerCase(),
  );

  return match?.id ?? null;
}

async function mapRowToEmployeePayload(
  adminClient: ReturnType<typeof createClient>,
  companyId: number,
  row: ImportRow,
) {
  const fullName = String(row.full_name ?? "").trim();
  if (!fullName) return null;

  const role = normalizeImportRole(row.role);
  const workLocationId = await resolveWorkLocationId(
    adminClient,
    companyId,
    row.work_location_name,
  );

  return {
    company_id: companyId,
    full_name: fullName,
    email: String(row.email ?? "").trim().toLowerCase() || null,
    phone_number: String(row.phone_number ?? "").trim() || null,
    department: String(row.department ?? "").trim() || null,
    job_title_name: String(row.job_title_name ?? "").trim() || null,
    employee_number: String(row.employee_number ?? "").trim() || null,
    role,
    employment_status: String(row.employment_status ?? "نشط").trim() || "نشط",
    contract_type: String(row.contract_type ?? "دوام كامل").trim() || "دوام كامل",
    gender: String(row.gender ?? "ذكر").trim() || "ذكر",
    date_of_birth: row.date_of_birth || null,
    nationality: String(row.nationality ?? "").trim() || null,
    id_number: Number.isFinite(Number(row.id_number)) ? Number(row.id_number) : null,
    national_address: String(row.national_address ?? "").trim() || null,
    hire_date: row.hire_date || null,
    iban: String(row.iban ?? "").trim() || null,
    leave_balance: Number(row.leave_balance) || 0,
    direct_manager_name: String(row.direct_manager_name ?? "").trim() || null,
    work_location_id: workLocationId,
    basic_salary: Number(row.basic_salary) || 0,
    housing_allowance: Number(row.housing_allowance) || 0,
    other_allowance: Number(row.other_allowance) || 0,
    transport_allowance: 0,
  };
}

async function resolveCallerContext(
  adminClient: ReturnType<typeof createClient>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
) {
  const metaCompanyId = Number(user.user_metadata?.company_id);
  const email = String(user.email ?? "").trim().toLowerCase();

  const { data: employeeRows, error } = await adminClient
    .from("employees")
    .select("id, company_id, role, full_name, email, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  const matchedRows = (employeeRows ?? [])
    .filter(
      (row) => String(row.email ?? "").trim().toLowerCase() === email,
    )
    .sort(
      (a, b) =>
        new Date(String(b.updated_at ?? 0)).getTime() -
        new Date(String(a.updated_at ?? 0)).getTime(),
    );

  if (error) throw error;

  const companyId =
    Number.isFinite(metaCompanyId) && metaCompanyId > 0
      ? metaCompanyId
      : Number(matchedRows[0]?.company_id);

  if (!Number.isFinite(companyId) || companyId <= 0) {
    throw new Error("Could not resolve admin company.");
  }

  const caller =
    matchedRows.find((row) => Number(row.company_id) === companyId) ??
    matchedRows[0];

  if (!caller || !MANAGEMENT_ROLES.has(String(caller.role ?? ""))) {
    throw new Error("Forbidden: insufficient permissions for bulk import.");
  }

  return { companyId, caller };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Supabase environment is not configured.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const sendInvites = Boolean(body.send_invites);

    if (rows.length === 0) {
      throw new Error("No employee rows provided.");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { companyId } = await resolveCallerContext(adminClient, user);

    const origin = req.headers.get("origin") ?? "";
    const redirectTo =
      String(body.redirect_to ?? "").trim() ||
      `${origin}/update-password`;

    const imported: Array<{ id: number; full_name: string; email: string | null }> =
      [];
    let invitesSent = 0;
    const inviteErrors: string[] = [];

    for (const row of rows) {
      const payload = await mapRowToEmployeePayload(adminClient, companyId, row);
      if (!payload) continue;

      const email = payload.email;
      let authUserId: string | null = null;

      if (sendInvites && email) {
        const { data: inviteData, error: inviteError } =
          await adminClient.auth.admin.inviteUserByEmail(email, {
            data: {
              full_name: payload.full_name,
              company_id: companyId,
              role: payload.role,
            },
            redirectTo,
          });

        if (inviteError) {
          inviteErrors.push(`${email}: ${inviteError.message}`);
        } else {
          authUserId = inviteData.user?.id ?? null;
          invitesSent += 1;
        }
      }

      const { data: employee, error: insertError } = await adminClient
        .from("employees")
        .insert(payload)
        .select("id, full_name, email")
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      imported.push(employee);

      if (authUserId && employee?.id) {
        await adminClient.auth.admin.updateUserById(authUserId, {
          user_metadata: {
            full_name: employee.full_name,
            company_id: companyId,
            role: payload.role,
            employee_id: employee.id,
          },
        });
      }
    }

    return new Response(
      JSON.stringify({
        imported: imported.length,
        invitesSent,
        rows: imported,
        inviteErrors,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bulk import failed.";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
