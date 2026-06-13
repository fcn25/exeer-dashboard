import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCorsPreflight, jsonResponse } from "../_shared/cors.ts";
import { selectReadTool } from "./gemini.ts";
import {
  getDailyGeminiLimit,
  invokeReadRpc,
  RATE_LIMIT_MESSAGE,
  WRITE_REFUSAL,
} from "./readTools.ts";

type AgentQueryBody = {
  query?: unknown;
  p_employee_id?: unknown;
  employee_id?: unknown;
};

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
    const geminiModel = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash";

    if (!supabaseUrl || !anonKey) {
      return jsonResponse({ error: "Server configuration error." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    let body: AgentQueryBody = {};
    try {
      body = (await req.json()) as AgentQueryBody;
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const query = String(body.query ?? "").trim();
    if (!query) return jsonResponse({ error: "Query is required." }, 400);
    if (query.length > 2000) return jsonResponse({ error: "Query is too long." }, 400);

    const [{ data: employeeId }, { data: companyId }] = await Promise.all([
      userClient.rpc("get_my_employee_id"),
      userClient.rpc("get_my_company_id"),
    ]);

    if (!employeeId || !companyId) {
      return jsonResponse({ error: "Employee profile not found." }, 403);
    }

    const directEmployeeId = Number(body.p_employee_id ?? body.employee_id);
    if (Number.isFinite(directEmployeeId) && directEmployeeId > 0) {
      const result = await invokeReadRpc(userClient, "q_employee_summary", {
        p_employee_id: directEmployeeId,
      });
      return jsonResponse(result);
    }

    const { data: tierRow } = await userClient
      .from("companies")
      .select("subscription_tier")
      .eq("id", Number(companyId))
      .maybeSingle();

    const limit = getDailyGeminiLimit(String(tierRow?.subscription_tier ?? "trial"));
    const { data: usageCount } = await userClient.rpc("get_agent_gemini_usage_today");
    if (Number(usageCount ?? 0) >= limit) {
      return jsonResponse({
        answer_text: RATE_LIMIT_MESSAGE,
        result_type: "text",
        data: null,
        command_type: "read",
        status: "refused",
        tool_name: null,
        gemini: true,
      });
    }

    if (!geminiApiKey) {
      return jsonResponse({ error: "AI service is not configured." }, 500);
    }

    let toolCall: { name: string; args: Record<string, unknown> } | null = null;
    try {
      toolCall = await selectReadTool(query, geminiApiKey, geminiModel);
    } catch (geminiError) {
      console.error("Gemini error:", geminiError);
      await userClient.from("agent_command_log").insert({
        company_id: Number(companyId),
        employee_id: Number(employeeId),
        raw_text: query,
        tool_name: "error",
        command_type: "read",
        status: "error",
        result_summary: "خطأ Gemini",
      });
      return jsonResponse({
        answer_text: "تعذّر معالجة طلبك حالياً. حاول مرة أخرى.",
        result_type: "text",
        data: null,
        command_type: "read",
        status: "error",
        tool_name: "error",
        gemini: true,
      });
    }

    if (!toolCall?.name) {
      const unclear = {
        answer_text: "لم أفهم طلبك. صِغ سؤالك في جملة واحدة واضحة.",
        result_type: "text",
        data: null,
        command_type: "read",
        status: "done",
        tool_name: "unsupported_request",
        gemini: true,
      };
      await userClient.rpc("increment_agent_gemini_usage");
      await userClient.from("agent_command_log").insert({
        company_id: Number(companyId),
        employee_id: Number(employeeId),
        raw_text: query,
        tool_name: "unsupported_request",
        command_type: "read",
        status: "done",
        result_summary: "غير واضح",
      });
      return jsonResponse(unclear);
    }

    const result = await invokeReadRpc(userClient, toolCall.name, toolCall.args);

    if (result.command_type === "write" && result.status === "refused") {
      await userClient.from("agent_command_log").insert({
        company_id: Number(companyId),
        employee_id: Number(employeeId),
        raw_text: query,
        tool_name: toolCall.name,
        command_type: "write",
        status: "refused",
        result_summary: WRITE_REFUSAL,
      });
      return jsonResponse({ ...result, gemini: true });
    }

    await userClient.rpc("increment_agent_gemini_usage");
    await userClient.from("agent_command_log").insert({
      company_id: Number(companyId),
      employee_id: Number(employeeId),
      raw_text: query,
      tool_name: toolCall.name,
      command_type: "read",
      status: "done",
      result_summary: String(result.result_summary ?? "").slice(0, 200),
    });

    return jsonResponse({ ...result, gemini: true });
  } catch (error) {
    console.error("agent-query error:", error);
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return jsonResponse({ error: message }, 500);
  }
});
