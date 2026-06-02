import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import { DEFAULT_INDUSTRY } from "../constants/companyProfile.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول companies غير جاهز. نفّذ ملفات migrations في Supabase SQL Editor.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

export async function getCompanyProfile() {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, industry")
    .eq("id", companyId)
    .maybeSingle();

  if (error) throw new Error(mapDbError(error));

  return {
    id: data?.id ?? companyId,
    name: data?.name ?? "Exeer",
    industry: data?.industry?.trim() || DEFAULT_INDUSTRY,
  };
}

export async function getCompanyIndustry() {
  const profile = await getCompanyProfile();
  return profile.industry;
}

export async function updateCompanyIndustry(industry) {
  const companyId = getCompanyId();
  const trimmed = String(industry ?? "").trim();
  if (!trimmed) throw new Error("يرجى اختيار قطاع المنشأة.");

  const { data, error } = await supabase
    .from("companies")
    .update({ industry: trimmed })
    .eq("id", companyId)
    .select("id, name, industry")
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}
