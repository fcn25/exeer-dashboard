import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { DateInput } from "../ui/DateInput.jsx";
import { listActiveEmployees } from "../../services/payrollService.js";
import {
  createEvaluationCycleWithAssignments,
  listEvaluationTemplates,
} from "../../services/performanceService.js";

const EMPTY_FORM = {
  name: "",
  startDate: "",
  endDate: "",
  templateId: "",
  employeeIds: [],
};

export default function CreateCycleModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setForm({ ...EMPTY_FORM, employeeIds: [] });
    setError("");
    setIsSaving(false);

    let cancelled = false;

    async function loadOptions() {
      setIsLoadingOptions(true);
      try {
        const [templateRows, employeeRows] = await Promise.all([
          listEvaluationTemplates(),
          listActiveEmployees(),
        ]);
        if (cancelled) return;
        setTemplates(templateRows);
        setEmployees(employeeRows);
      } catch (err) {
        if (!cancelled) setError(err.message || "تعذّر تحميل بيانات النموذج.");
      } finally {
        if (!cancelled) setIsLoadingOptions(false);
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const toggleEmployee = (employeeId) => {
    const id = Number(employeeId);
    setForm((prev) => {
      const exists = prev.employeeIds.includes(id);
      return {
        ...prev,
        employeeIds: exists
          ? prev.employeeIds.filter((value) => value !== id)
          : [...prev.employeeIds, id],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setError("");

    try {
      await createEvaluationCycleWithAssignments({
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        templateId: form.templateId,
        employeeIds: form.employeeIds,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "تعذّر إنشاء الدورة.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-cycle-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="إغلاق"
        onClick={onClose}
      />

      <div className="relative max-h-[92vh] w-full max-w-xl overflow-hidden rounded-t-3xl bg-md-surface sm:rounded-3xl md-elevated">
        <div className="flex items-start justify-between gap-4 border-b border-exeer-border px-6 py-5">
          <div className="space-y-1">
            <h2 id="create-cycle-title" className="text-xl font-bold text-exeer-primary">
              إنشاء دورة تقييم
            </h2>
            <p className="text-sm text-exeer-muted">
              سيتم إنشاء مهام تقييم معلّقة لكل موظف محدّد.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex max-h-[calc(92vh-88px)] flex-col">
          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <label htmlFor="cycle-name" className="md-label block">
                اسم الدورة
              </label>
              <input
                id="cycle-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                disabled={isSaving}
                required
                placeholder="مثال: تقييم الربع الأول 2026"
                className="md-input"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DateInput
                id="cycle-start"
                label="تاريخ البداية"
                value={form.startDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, startDate: e.target.value }))
                }
                disabled={isSaving}
                required
              />
              <DateInput
                id="cycle-end"
                label="تاريخ النهاية"
                value={form.endDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, endDate: e.target.value }))
                }
                disabled={isSaving}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="cycle-template" className="md-label block">
                نموذج التقييم
              </label>
              <select
                id="cycle-template"
                value={form.templateId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, templateId: e.target.value }))
                }
                disabled={isSaving || isLoadingOptions}
                required
                className="md-input"
              >
                <option value="">اختر نموذجاً</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="md-label block">الموظفون المشاركون</label>
                <span className="text-xs text-exeer-muted">
                  {form.employeeIds.length} محدّد
                </span>
              </div>
              <div className="md-surface-muted max-h-52 space-y-2 overflow-y-auto rounded-2xl p-3">
                {isLoadingOptions ? (
                  <p className="px-2 py-4 text-center text-sm text-exeer-muted">
                    جاري التحميل...
                  </p>
                ) : employees.length ? (
                  employees.map((employee) => {
                    const id = Number(employee.id);
                    const checked = form.employeeIds.includes(id);
                    return (
                      <label
                        key={employee.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-exeer-hover"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEmployee(id)}
                          disabled={isSaving}
                          className="h-4 w-4 rounded border-exeer-border text-exeer-primary focus:ring-0"
                        />
                        <span className="flex-1 text-sm text-exeer-primary">
                          {employee.full_name}
                        </span>
                        {employee.department ? (
                          <span className="text-xs text-exeer-muted">
                            {employee.department}
                          </span>
                        ) : null}
                      </label>
                    );
                  })
                ) : (
                  <p className="px-2 py-4 text-center text-sm text-exeer-muted">
                    لا يوجد موظفون نشطون.
                  </p>
                )}
              </div>
            </div>

            {error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-exeer-border px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="md-btn-tonal w-full sm:w-auto sm:min-w-[120px]"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving || isLoadingOptions}
              className="md-btn-primary w-full sm:w-auto sm:min-w-[160px]"
            >
              {isSaving ? "جاري الإنشاء..." : "إنشاء الدورة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
