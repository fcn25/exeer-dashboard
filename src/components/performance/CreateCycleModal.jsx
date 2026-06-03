import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { DateInput } from "../ui/DateInput.jsx";
import TemplatePickerGrid from "../evaluation/TemplatePickerGrid.jsx";
import {
  launchEvaluationCycleForDepartment,
  listCompanyDepartments,
  listEmployeesByDepartment,
  listEvaluationTemplates,
} from "../../services/performanceService.js";
import { templateHasQuestions } from "../../utils/evaluationTemplateQuestions.js";

const EMPTY_FORM = {
  name: "",
  startDate: "",
  endDate: "",
  templateId: "",
  department: "",
};

export default function CreateCycleModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [templates, setTemplates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [targetCount, setTargetCount] = useState(0);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setForm({ ...EMPTY_FORM });
    setTargetCount(0);
    setError("");
    setIsSaving(false);

    let cancelled = false;

    async function loadOptions() {
      setIsLoadingOptions(true);
      try {
        const [templateRows, departmentRows] = await Promise.all([
          listEvaluationTemplates(),
          listCompanyDepartments(),
        ]);
        if (cancelled) return;
        setTemplates(templateRows);
        setDepartments(departmentRows);
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

  useEffect(() => {
    if (!isOpen || !form.department) {
      setTargetCount(0);
      return undefined;
    }

    let cancelled = false;

    async function loadTargetCount() {
      try {
        const rows = await listEmployeesByDepartment(form.department);
        if (!cancelled) setTargetCount(rows.length);
      } catch {
        if (!cancelled) setTargetCount(0);
      }
    }

    loadTargetCount();
    return () => {
      cancelled = true;
    };
  }, [form.department, isOpen]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;

    if (!form.templateId) {
      setError("يرجى اختيار نموذج تقييم جاهز.");
      return;
    }

    const selectedTemplate = templates.find(
      (row) => String(row.id) === String(form.templateId),
    );
    if (!templateHasQuestions(selectedTemplate)) {
      setError("النموذج المحدّد لا يحتوي على أسئلة. اختر نموذجاً جاهزاً أو أضف الأسئلة في قاعدة البيانات.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await launchEvaluationCycleForDepartment({
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        templateId: form.templateId,
        department: form.department,
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
              يُنشئ النظام استجابات معلّقة وإشعارات لجميع موظفي القسم المحدّد.
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
              <label className="md-label block">نموذج التقييم الجاهز</label>
              <p className="text-xs leading-relaxed text-exeer-muted">
                اختر أحد النماذج المُعدّة مسبقاً — لا حاجة لكتابة الأسئلة يدوياً.
              </p>
              {isLoadingOptions ? (
                <p className="text-sm text-exeer-muted">جاري تحميل النماذج...</p>
              ) : (
                <TemplatePickerGrid
                  templates={templates}
                  selectedId={form.templateId}
                  onSelect={(templateId) =>
                    setForm((prev) => ({ ...prev, templateId }))
                  }
                  disabled={isSaving}
                />
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="cycle-department" className="md-label block">
                القسم المستهدف
              </label>
              <select
                id="cycle-department"
                value={form.department}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, department: e.target.value }))
                }
                disabled={isSaving || isLoadingOptions}
                required
                className="md-input"
              >
                <option value="">اختر قسماً</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
              {form.department ? (
                <p className="text-xs text-exeer-muted">
                  {targetCount} موظف نشط في هذا القسم — سيتم إنشاء استجابة وإشعار
                  لكل من لديه حساب مرتبط.
                </p>
              ) : null}
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
              {isSaving ? "جاري الإنشاء..." : "إطلاق الدورة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
