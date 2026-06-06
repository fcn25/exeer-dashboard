import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  handleCorsPreflight,
  jsonResponse,
} from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonResponse(
        { error: "Supabase environment is not configured for invite-employee." },
        500,
      );
    }

    const apiKey = req.headers.get("apikey") ?? "";
    if (!apiKey || apiKey !== anonKey) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const email = String(body.email ?? "").trim().toLowerCase();

    if (!email) {
      return jsonResponse({ error: "Employee email is required." }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const redirectTo =
      String(body.redirect_to ?? "").trim() ||
      `${req.headers.get("origin") ?? ""}/`;

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

    if (error) throw error;

    return jsonResponse({ user: data.user });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to invite employee.";
    return jsonResponse({ error: message }, 400);
  }
});
