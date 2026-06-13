import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export const WRITE_REFUSAL =
  "أوامر التنفيذ في «الوكيل الذكي» — هذه الشاشة للاستعلام";

export const RATE_LIMIT_MESSAGE = "وصلت حد الاستخدام اليومي، يتجدد غداً";

export const READ_RPC_NAMES = [
  "q_active_employees_count",
  "q_attendance_today",
  "q_iqamas_expiring",
  "q_contracts_expiring",
  "q_employees_without_annual_leave",
  "q_pending_approvals",
  "q_employee_search",
  "q_employee_summary",
] as const;

export type ReadRpcName = (typeof READ_RPC_NAMES)[number];

export const GEMINI_TOOL_DECLARATIONS = [
  {
    name: "q_active_employees_count",
    description: "عدد الموظفين النشطين في الشركة.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "q_attendance_today",
    description: "أعداد حضور اليوم: يعملون، في إجازة، متأخرون.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "q_iqamas_expiring",
    description: "قائمة إقامات تنتهي خلال عدد أيام.",
    parameters: {
      type: "object",
      properties: {
        p_days: { type: "integer", description: "عدد الأيام (افتراضي 30)" },
      },
    },
  },
  {
    name: "q_contracts_expiring",
    description: "ذكرى العقود السنوية خلال عدد أيام.",
    parameters: {
      type: "object",
      properties: {
        p_days: { type: "integer", description: "عدد الأيام (افتراضي 90)" },
      },
    },
  },
  {
    name: "q_employees_without_annual_leave",
    description: "موظفون لم يأخذوا إجازة سنوية هذا العام.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "q_pending_approvals",
    description: "طلبات معلقة تحتاج موافقة المستخدم.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "q_employee_search",
    description: "بحث موظف بالاسم داخل الشركة.",
    parameters: {
      type: "object",
      properties: {
        p_term: { type: "string", description: "اسم أو جزء من الاسم" },
      },
      required: ["p_term"],
    },
  },
  {
    name: "q_employee_summary",
    description: "ملخص موظف بالمعرّف.",
    parameters: {
      type: "object",
      properties: {
        p_employee_id: { type: "integer", description: "معرّف الموظف" },
      },
      required: ["p_employee_id"],
    },
  },
  {
    name: "unsupported_request",
    description: "عند طلب تنفيذ/تعديل/إضافة/حذف أو أمر غير مدعوم.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", enum: ["write", "unclear"] },
      },
      required: ["reason"],
    },
  },
];

export function getDailyGeminiLimit(tier: string): number {
  const normalized = String(tier ?? "trial").toLowerCase();
  if (normalized === "growth") return 100;
  return 40;
}

export async function invokeReadRpc(
  client: SupabaseClient,
  rpcName: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (rpcName === "unsupported_request") {
    const reason = String(args.reason ?? "write");
    if (reason === "write") {
      return {
        result_type: "refused",
        answer_text: WRITE_REFUSAL,
        data: null,
        command_type: "write",
        status: "refused",
        tool_name: "unsupported_request",
        result_summary: WRITE_REFUSAL,
      };
    }
    return {
      result_type: "text",
      answer_text: "لم أفهم طلبك. صِغ سؤالك في جملة واحدة واضحة.",
      data: null,
      command_type: "read",
      status: "done",
      tool_name: "unsupported_request",
      result_summary: "غير واضح",
    };
  }

  if (!READ_RPC_NAMES.includes(rpcName as ReadRpcName)) {
    return {
      result_type: "refused",
      answer_text: WRITE_REFUSAL,
      data: null,
      command_type: "write",
      status: "refused",
      tool_name: rpcName,
      result_summary: WRITE_REFUSAL,
    };
  }

  const rpcArgs: Record<string, unknown> = {};
  if (rpcName === "q_iqamas_expiring") {
    rpcArgs.p_days = Number(args.p_days ?? args.within_days) || 30;
  } else if (rpcName === "q_contracts_expiring") {
    rpcArgs.p_days = Number(args.p_days ?? args.within_days) || 90;
  } else if (rpcName === "q_employee_search") {
    rpcArgs.p_term = String(args.p_term ?? args.name ?? "").trim();
  } else if (rpcName === "q_employee_summary") {
    rpcArgs.p_employee_id = Number(args.p_employee_id ?? args.employee_id);
  }

  const { data, error } = await client.rpc(rpcName, rpcArgs);
  if (error) throw error;

  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    ...payload,
    command_type: "read",
    status: "done",
    tool_name: rpcName,
    result_summary: String(payload.answer_text ?? "").slice(0, 120),
  };
}
