import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";

const PROMO_SUCCESS_MESSAGE =
  "تم تفعيل الكود بنجاح! تمت إضافة 60 يوماً لاشتراكك";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  return error.message || "تعذّر إكمال العملية.";
}

function mapPromoError(error) {
  const code = error?.message ?? "";
  if (code.includes("invalid_promo_code")) {
    return "كود غير صالح أو مستخدم مسبقاً.";
  }
  if (code.includes("owner_required")) {
    return "فقط مالك المنشأة يمكنه تفعيل أكواد الخصم.";
  }
  if (code.includes("promo_code_required")) {
    return "يرجى إدخال كود الخصم.";
  }
  if (code.includes("company_not_found")) {
    return "تعذّر تحديد منشأتك.";
  }
  return mapDbError(error);
}

export async function fetchCompanyBilling() {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, plan_status, trial_ends_at")
    .eq("id", companyId)
    .maybeSingle();

  if (error) throw new Error(mapDbError(error));

  return {
    id: data?.id ?? companyId,
    name: data?.name ?? "Exeer",
    plan_status: data?.plan_status ?? "trial",
    trial_ends_at: data?.trial_ends_at ?? null,
  };
}

export async function applyPromoCode(rawCode) {
  const code = String(rawCode ?? "").trim();
  if (!code) throw new Error("يرجى إدخال كود الخصم.");

  const { data, error } = await supabase.rpc("apply_promo_code", {
    p_code: code,
  });

  if (error) throw new Error(mapPromoError(error));

  const billing = await fetchCompanyBilling();
  return {
    trial_ends_at: data ?? billing.trial_ends_at,
    message: PROMO_SUCCESS_MESSAGE,
    billing,
  };
}

export { PROMO_SUCCESS_MESSAGE };
