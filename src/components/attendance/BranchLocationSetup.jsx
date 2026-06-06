import { useCallback, useEffect, useState } from "react";
import { MapPin, Plus, Save } from "lucide-react";
import BranchLocationMap from "./BranchLocationMap.jsx";
import {
  listCompanyBranches,
  saveCompanyBranch,
} from "../../services/branchService.js";
import SuccessToast from "../ui/SuccessToast.jsx";

const DEFAULT_RADIUS = 150;
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

export default function BranchLocationSetup() {
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  const loadBranches = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const rows = await listCompanyBranches();
      setBranches(rows);
    } catch (err) {
      setError(err.message || "تعذّر تحميل مواقع الفروع.");
      setBranches([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const handleSelectBranch = (branch) => {
    setForm({
      id: branch.id,
      name: branch.name,
      latitude: branch.latitude,
      longitude: branch.longitude,
      radiusMeters: branch.radiusMeters,
    });
    setError("");
  };

  const handleNewBranch = () => {
    setForm(emptyForm());
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

      const saved = await saveCompanyBranch({
        id: form.id,
        name: form.name,
        latitude: form.latitude,
        longitude: form.longitude,
        radiusMeters: form.radiusMeters,
      });

      await loadBranches();
      setForm({
        id: saved.id,
        name: saved.name,
        latitude: saved.latitude,
        longitude: saved.longitude,
        radiusMeters: saved.radiusMeters,
      });
      setSuccessToast(
        form.id ? "تم تحديث موقع الفرع بنجاح." : "تم حفظ موقع الفرع بنجاح.",
      );
    } catch (err) {
      setError(err.message || "تعذّر حفظ موقع الفرع.");
    } finally {
      setIsSaving(false);
    }
  };

  const hasPin = form.latitude != null && form.longitude != null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="md-surface flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-exeer-primary">الفروع</h2>
            <button
              type="button"
              onClick={handleNewBranch}
              className="md-btn-tonal inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              جديد
            </button>
          </div>

          {isLoading ? (
            <p className="py-6 text-center text-sm text-exeer-muted">جاري التحميل...</p>
          ) : branches.length ? (
            <ul className="space-y-2">
              {branches.map((branch) => {
                const isActive = form.id === branch.id;
                return (
                  <li key={branch.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectBranch(branch)}
                      className={`w-full rounded-md border px-3 py-2.5 text-start text-sm transition-colors ${
                        isActive
                          ? "border-exeer-primary bg-exeer-surface font-semibold text-exeer-primary"
                          : "border-exeer-border bg-white text-exeer-muted hover:bg-exeer-hover"
                      }`}
                    >
                      {branch.name}
                      <span className="mt-0.5 block text-[11px] font-normal text-exeer-muted">
                        {branch.radiusMeters} م
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-exeer-border px-3 py-6 text-center text-sm text-exeer-muted">
              لا توجد فروع بعد. أضف فرعاً جديداً.
            </p>
          )}
        </aside>

        <section className="space-y-5">
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
              <span className="md-label">نصف القطر المسموح (متر)</span>
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
                انقر على الخريطة لإسقاط دبوس الفرع.{" "}
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

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="md-btn-primary inline-flex items-center gap-2 px-5 py-2.5"
            >
              <Save className="h-4 w-4" aria-hidden />
              {isSaving
                ? "جاري الحفظ..."
                : form.id
                  ? "تحديث موقع الفرع"
                  : "حفظ موقع الفرع"}
            </button>
          </div>
        </section>
      </div>

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
    </div>
  );
}
