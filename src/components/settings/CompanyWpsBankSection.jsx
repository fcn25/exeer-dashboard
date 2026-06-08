import { useEffect, useState } from "react";
import {
  getCompanyWpsProfile,
  updateCompanyWpsBankDetails,
} from "../../services/companyService.js";

const EMPTY_FORM = {
  company_iban: "",
  company_bank_name: "",
  establishment_id: "",
  mol_establishment_id: "",
};

export default function CompanyWpsBankSection() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setIsLoading(true);
      setError("");

      try {
        const profile = await getCompanyWpsProfile();
        if (!cancelled) {
          setForm({
            company_iban: profile.company_iban ?? "",
            company_bank_name: profile.company_bank_name ?? "",
            establishment_id: profile.establishment_id ?? "",
            mol_establishment_id: profile.mol_establishment_id ?? "",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "تعذّر تحميل بيانات بنك المنشأة.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      await updateCompanyWpsBankDetails(form);
      setSuccess("تم حفظ بيانات بنك المنشأة");
    } catch (err) {
      setError(err.message || "تعذّر حفظ بيانات بنك المنشأة.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="md-surface-muted max-w-xl space-y-4 p-5" onSubmit={handleSubmit}>
      <header className="space-y-1">
        <h3 className="text-base font-bold text-exeer-primary">
          بيانات بنك المنشأة (WPS)
        </h3>
        <p className="text-xs leading-relaxed text-exeer-muted">
          تُستخدم عند توليد ملف حماية الأجور. متاحة لمالك المنشأة فقط.
        </p>
      </header>

      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="md-label">آيبان المنشأة</span>
          <input
            type="text"
            value={form.company_iban}
            onChange={(event) => updateField("company_iban", event.target.value)}
            disabled={isLoading || isSaving}
            className="md-input"
            dir="ltr"
            placeholder="SA..."
          />
        </label>

        <label className="block space-y-1">
          <span className="md-label">بنك المنشأة</span>
          <input
            type="text"
            value={form.company_bank_name}
            onChange={(event) =>
              updateField("company_bank_name", event.target.value)
            }
            disabled={isLoading || isSaving}
            className="md-input"
            placeholder="مثال: الراجحي / 80"
          />
          <p className="text-xs text-exeer-muted">
            أدخل اسم البنك أو رمز SARIE إن وُجد.
          </p>
        </label>

        <label className="block space-y-1">
          <span className="md-label">رقم منشأة مدد</span>
          <input
            type="text"
            value={form.establishment_id}
            onChange={(event) =>
              updateField("establishment_id", event.target.value)
            }
            disabled={isLoading || isSaving}
            className="md-input"
          />
        </label>

        <label className="block space-y-1">
          <span className="md-label">رقم منشأة وزارة العمل</span>
          <input
            type="text"
            value={form.mol_establishment_id}
            onChange={(event) =>
              updateField("mol_establishment_id", event.target.value)
            }
            disabled={isLoading || isSaving}
            className="md-input"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading || isSaving}
        className="md-btn-primary"
      >
        {isSaving ? "جاري الحفظ..." : "حفظ بيانات البنك"}
      </button>

      {success ? (
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
      ) : null}
    </form>
  );
}
