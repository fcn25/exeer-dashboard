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

const COMPANY_PROFILE_SELECT =
  "id, name, industry, sector_id, company_iban, company_bank_name, establishment_id, mol_establishment_id, sectors!companies_sector_id_fkey(name_ar)";

function mapCompanyProfileRow(data, companyId) {
  return {
    id: data?.id ?? companyId,
    name: data?.name ?? "Exeer",
    industry: data?.industry?.trim() || DEFAULT_INDUSTRY,
    sector_id: data?.sector_id != null ? Number(data.sector_id) : null,
    sector_name: data?.sectors?.name_ar?.trim() || null,
    company_iban: String(data?.company_iban ?? "").trim(),
    company_bank_name: String(data?.company_bank_name ?? "").trim(),
    establishment_id: String(data?.establishment_id ?? "").trim(),
    mol_establishment_id: String(data?.mol_establishment_id ?? "").trim(),
  };
}

export async function getCompanyProfile() {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_PROFILE_SELECT)
    .eq("id", companyId)
    .maybeSingle();

  if (error) throw new Error(mapDbError(error));

  return mapCompanyProfileRow(data, companyId);
}

export async function getCompanyWpsProfile() {
  return getCompanyProfile();
}

export async function getCompanyIndustry() {
  const profile = await getCompanyProfile();
  return profile.industry;
}

export async function updateCompanySector(sectorId) {
  const companyId = getCompanyId();
  const parsed = Number(sectorId);
  if (!parsed || Number.isNaN(parsed)) {
    throw new Error("يرجى اختيار قطاع المنشأة.");
  }

  const { data, error } = await supabase
    .from("companies")
    .update({ sector_id: parsed })
    .eq("id", companyId)
    .select(COMPANY_PROFILE_SELECT)
    .single();

  if (error) throw new Error(mapDbError(error));
  return mapCompanyProfileRow(data, companyId);
}

export async function updateCompanyIndustry(industry) {
  const companyId = getCompanyId();
  const trimmed = String(industry ?? "").trim();
  if (!trimmed) throw new Error("يرجى اختيار قطاع المنشأة.");

  const { data, error } = await supabase
    .from("companies")
    .update({ industry: trimmed })
    .eq("id", companyId)
    .select(COMPANY_PROFILE_SELECT)
    .single();

  if (error) throw new Error(mapDbError(error));
  return mapCompanyProfileRow(data, companyId);
}

export async function updateCompanyWpsBankDetails({
  company_iban,
  company_bank_name,
  establishment_id,
  mol_establishment_id,
}) {
  const companyId = getCompanyId();

  const { data, error } = await supabase
    .from("companies")
    .update({
      company_iban: String(company_iban ?? "").trim(),
      company_bank_name: String(company_bank_name ?? "").trim(),
      establishment_id: String(establishment_id ?? "").trim(),
      mol_establishment_id: String(mol_establishment_id ?? "").trim(),
    })
    .eq("id", companyId)
    .select(COMPANY_PROFILE_SELECT)
    .single();

  if (error) throw new Error(mapDbError(error));
  return mapCompanyProfileRow(data, companyId);
}
