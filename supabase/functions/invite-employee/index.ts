import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCorsPreflight, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    console.log("1. Function started");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    console.log("2. URL:", supabaseUrl ? "exists" : "missing");
    console.log("3. Service key:", serviceRoleKey ? "exists" : "missing");

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    console.log("4. Email:", email);
    if (!email) {
      return jsonResponse({ error: "Employee email is required." }, 400);
    }

    const redirectTo =
      String(body.redirect_to ?? "").trim() ||
      `${req.headers.get("origin") ?? ""}/update-password`;

    console.log("5. Calling inviteUserByEmail...");
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name: body.full_name ?? "",
          company_id: body.company_id ?? null,
          role: body.role ?? "Employee",
          employee_id: body.employee_id ?? null,
        },
        redirectTo,
      },
    );

    if (error) {
      console.error("6. Error:", error.message, error.status);
      throw error;
    }

    const invitedUserId = data.user?.id;
    const employeeId = body.employee_id;
    if (invitedUserId) {
      let linked = false;
      let linkError: { message: string } | null = null;

      if (employeeId != null && employeeId !== "") {
        const { data: updatedRow, error } = await adminClient
          .from("employees")
          .update({ auth_user_id: invitedUserId })
          .eq("id", Number(employeeId))
          .is("auth_user_id", null)
          .select("id")
          .maybeSingle();

        if (error) {
          linkError = error;
        } else if (updatedRow?.id) {
          linked = true;
        }
      }

      if (!linked && email) {
        const { data: updatedRows, error } = await adminClient
          .from("employees")
          .update({ auth_user_id: invitedUserId })
          .ilike("email", email)
          .is("auth_user_id", null)
          .select("id");

        if (error) {
          linkError = error;
        } else if ((updatedRows ?? []).length > 0) {
          linked = true;
        }
      }

      if (linkError) {
        console.error("8. auth_user_id link error:", linkError.message);
      } else if (!linked) {
        console.warn("8. No unlinked employee row matched for auth_user_id binding.");
      }
    }

    console.log("7. Success:", invitedUserId);
    return jsonResponse({ user: data.user });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to invite employee.";
    return jsonResponse({ error: message }, 400);
  }
});
