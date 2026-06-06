import { supabase } from "../utils/supabaseClient.js";
import { requireCompanyId, scopeQueryByCompany } from "../utils/tenantScope.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول مواقع الفروع غير موجود. نفّذ migration 20250634000000_company_branches.sql في Supabase.";
  }
  if (error.code === "23505") {
    return "يوجد فرع بنفس الاسم مسبقاً.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

function mapBranchRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    radiusMeters: Number(row.radius_meters),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCompanyBranches() {
  const companyId = requireCompanyId("تحميل مواقع الفروع");

  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("company_branches")
      .select("id, company_id, name, latitude, longitude, radius_meters, created_at, updated_at")
      .order("name", { ascending: true }),
    companyId,
  );

  if (error) throw new Error(mapDbError(error));
  return (data ?? []).map(mapBranchRow).filter(Boolean);
}

export async function saveCompanyBranch({
  id,
  name,
  latitude,
  longitude,
  radiusMeters,
}) {
  const companyId = requireCompanyId("حفظ موقع الفرع");
  const trimmedName = String(name ?? "").trim();
  const lat = Number(latitude);
  const lng = Number(longitude);
  const radius = Number(radiusMeters);

  if (!trimmedName) throw new Error("اسم الفرع مطلوب.");
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error("خط العرض غير صالح.");
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error("خط الطول غير صالح.");
  }
  if (!Number.isFinite(radius) || radius <= 0 || radius > 5000) {
    throw new Error("نصف القطر يجب أن يكون بين 1 و 5000 متر.");
  }

  const payload = {
    company_id: companyId,
    name: trimmedName,
    latitude: lat,
    longitude: lng,
    radius_meters: Math.round(radius),
  };

  if (id) {
    const { data, error } = await scopeQueryByCompany(
      supabase
        .from("company_branches")
        .update(payload)
        .eq("id", id)
        .select("id, company_id, name, latitude, longitude, radius_meters, created_at, updated_at")
        .single(),
      companyId,
    );

    if (error) throw new Error(mapDbError(error));
    return mapBranchRow(data);
  }

  const { data, error } = await supabase
    .from("company_branches")
    .insert(payload)
    .select("id, company_id, name, latitude, longitude, radius_meters, created_at, updated_at")
    .single();

  if (error) throw new Error(mapDbError(error));
  return mapBranchRow(data);
}
