import { useCallback, useEffect, useState } from "react";
import { Loader2, MapPin, Pencil, Plus, Save, Trash2 } from "lucide-react";
import BranchLocationMap from "./BranchLocationMap.jsx";
import {
  deleteCompanyBranch,
  listCompanyBranches,
  saveCompanyBranch,
} from "../../services/branchService.js";

const DEFAULT_RADIUS = 50;
const RADIUS_PRESETS = [50, 100, 150, 200, 300, 500];

function emptyForm() {
  return {
    id: null,
    name: "",
    latitude: null,
    longitude: null,
    radiusMeters: DEFAULT_RADIUS,
  };
}

function branchToForm(branch) {
  return {
    id: branch.id,
    name: branch.name,
    latitude: branch.latitude,
    longitude: branch.longitude,
    radiusMeters: branch.radiusMeters,
  };
}

export default function BranchGeofenceManager({
  onToast,
  compact = false,
}) {
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const loadBranches = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const rows = await listCompanyBranches();
      setBranches(rows);
      return rows;
    } catch (err) {
      setError(err.message || "تعذّر تحميل مواقع الفروع.");
      setBranches([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const handleNewBranch = () => {
    setForm(emptyForm());
    setError("");
  };

  const handleEditBranch = (branch) => {
    setForm(branchToForm(branch));
    setError("");
  };

  const handleLocationPick = ({ lat, lng }) => {
    setForm((current) => ({
      ...current,
      latitude: lat,
      longitude: lng,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");

    try {
      if (form.latitude == null || form.longitude == null) {
        throw new Error("انقر على الخريطة لتحديد موقع الفرع.");
      }

      const wasUpdate = Boolean(form.id);
      await saveCompanyBranch({
        id: form.id,
        name: form.name,
        latitude: form.latitude,
        longitude: form.longitude,
        radiusMeters: form.radiusMeters,
      });

      await loadBranches();
      setForm(emptyForm());

      const message = wasUpdate
        ? "تم تحديث موقع الفرع بنجاح."
        : "تم حفظ موقع الفرع بنجاح.";
      onToast?.(message);
    } catch (err) {
      setError(err.message || "تعذّر حفظ موقع الفرع.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (branch) => {
    const confirmed = window.confirm(
      `هل تريد حذف فرع «${branch.name}»؟ سيتم إلغاء ربط الموظفين المرتبطين به.`,
    );
    if (!confirmed) return;

    setDeletingId(branch.id);
    setError("");

    try {
      await deleteCompanyBranch(branch.id);
      if (form.id === branch.id) {
        setForm(emptyForm());
      }
      await loadBranches();
      onToast?.("تم حذف موقع الفرع بنجاح.");
    } catch (err) {
      setError(err.message || "تعذّر حذف موقع الفرع.");
    } finally {
      setDeletingId(null);
    }
  };

  const hasPin = form.latitude != null && form.longitude != null;
  const formTitle = form.id ? "تعديل الفرع" : "إضافة فرع جديد";

  return (
    <div className={`space-y-6 ${compact ? "" : ""}`}>
      <section className="md-surface space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-exeer-primary">{formTitle}</h2>
            <p className="mt-0.5 text-xs text-exeer-muted">
              حدد اسم الفرع، النطاق المسموح، وموقع الدبوس على الخريطة
            </p>
          </div>
          {form.id ? (
            <button
              type="button"
              onClick={handleNewBranch}
              className="md-btn-tonal inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              فرع جديد
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="md-label">اسم الفرع</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="مثال: الفرع الرئيسي — الرياض"
              className="md-input"
            />
          </label>

          <label className="space-y-1.5">
            <span className="md-label">النطاق المسموح (متر)</span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={25}
                max={500}
                step={25}
                value={form.radiusMeters}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    radiusMeters: Number(event.target.value),
                  }))
                }
                className="h-2 flex-1 cursor-pointer accent-exeer-primary"
              />
              <input
                type="number"
                min={25}
                max={5000}
                step={25}
                value={form.radiusMeters}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    radiusMeters: Number(event.target.value) || DEFAULT_RADIUS,
                  }))
                }
                className="md-input w-24 text-center"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {RADIUS_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({ ...current, radiusMeters: preset }))
                  }
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    form.radiusMeters === preset
                      ? "bg-exeer-primary text-white"
                      : "bg-exeer-surface text-exeer-muted hover:bg-exeer-hover"
                  }`}
                >
                  {preset} م
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-exeer-muted">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              انقر على الخريطة لإسقاط الدبوس.{" "}
              {hasPin
                ? `الإحداثيات: ${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`
                : "لم يُحدد موقع بعد."}
            </span>
          </div>
          <BranchLocationMap
            latitude={form.latitude}
            longitude={form.longitude}
            radiusMeters={form.radiusMeters}
            onLocationPick={handleLocationPick}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="md-btn-primary inline-flex items-center gap-2 px-5 py-2.5"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            {isSaving
              ? "جاري الحفظ..."
              : form.id
                ? "تحديث الفرع"
                : "حفظ الفرع"}
          </button>
        </div>
      </section>

      <section className="md-surface overflow-hidden">
        <div className="border-b border-exeer-border px-5 py-4">
          <h2 className="text-sm font-bold text-exeer-primary">الفروع المحفوظة</h2>
          <p className="mt-0.5 text-xs text-exeer-muted">
            {isLoading
              ? "جاري التحميل..."
              : `${branches.length} فرع مُعرَّف للتحقق الجغرافي`}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-exeer-muted">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            جاري تحميل الفروع...
          </div>
        ) : branches.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-exeer-muted">
            لا توجد فروع محفوظة. أضف فرعاً من النموذج أعلاه.
          </p>
        ) : compact ? (
          <ul className="divide-y divide-exeer-border">
            {branches.map((branch) => (
              <li key={branch.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-exeer-primary">
                      {branch.name}
                    </p>
                    <p className="mt-1 text-xs text-exeer-muted">
                      {branch.radiusMeters} م · {branch.latitude.toFixed(4)},{" "}
                      {branch.longitude.toFixed(4)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditBranch(branch)}
                      className="md-btn-tonal inline-flex items-center gap-1 px-2.5 py-1.5 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(branch)}
                      disabled={deletingId === branch.id}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {deletingId === branch.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      )}
                      حذف
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-exeer-border bg-exeer-surface">
                  <th className="px-5 py-3 text-start font-semibold text-exeer-primary">
                    الفرع
                  </th>
                  <th className="px-5 py-3 text-start font-semibold text-exeer-primary">
                    خط العرض
                  </th>
                  <th className="px-5 py-3 text-start font-semibold text-exeer-primary">
                    خط الطول
                  </th>
                  <th className="px-5 py-3 text-start font-semibold text-exeer-primary">
                    النطاق
                  </th>
                  <th className="px-5 py-3 text-start font-semibold text-exeer-primary">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr
                    key={branch.id}
                    className="border-b border-exeer-border last:border-b-0 hover:bg-exeer-surface/60"
                  >
                    <td className="px-5 py-3.5 font-medium text-exeer-primary">
                      {branch.name}
                    </td>
                    <td className="px-5 py-3.5 text-exeer-muted">
                      {branch.latitude.toFixed(5)}
                    </td>
                    <td className="px-5 py-3.5 text-exeer-muted">
                      {branch.longitude.toFixed(5)}
                    </td>
                    <td className="px-5 py-3.5 text-exeer-muted">
                      {branch.radiusMeters} م
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditBranch(branch)}
                          className="md-btn-tonal inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(branch)}
                          disabled={deletingId === branch.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingId === branch.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          )}
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
