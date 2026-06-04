import { useEffect, useMemo, useState } from "react";
import { Eye, X } from "lucide-react";
import { getTemplatePreviewSections } from "../../constants/performanceTemplates.js";
import {
  launchEvaluationCycleForDepartment,
  listCompanyDepartments,
  listEmployeesByDepartment,
  listEvaluationTemplates,
  resolveEvaluationTemplateId,
} from "../../services/performanceService.js";
import {
  getTemplateDescription,
  getTemplateDisplayTitle,
  getTemplatePayload,
  templateHasQuestions,
} from "../../utils/evaluationTemplateQuestions.js";
import { buildTemplatePreviewSections } from "../../utils/evaluationTemplateStructure.js";
import { DateInput } from "../ui/DateInput.jsx";
import TemplatePreviewCriterionAccordion from "./TemplatePreviewCriterionAccordion.jsx";

const EMPTY_FORM = {
  name: "",
  startDate: "",
  endDate: "",
  department: "",
};

function PreviewCategoryBlock({ section, index }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-bold text-slate-900">
        {index + 1}. {section.title}
      </h3>
      <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
        <TemplatePreviewCriterionAccordion criteria={section.criteria} />
      </div>
    </section>
  );
}

export default function TemplatePreviewModal({
  template,
  onClose,
  onCycleLaunched,
}) {
  const [step, setStep] = useState("preview");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [departments, setDepartments] = useState([]);
  const [targetCount, setTargetCount] = useState(0);
  const [dbTemplates, setDbTemplates] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!template) return;

    setStep("preview");
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
        setDbTemplates(templateRows);
        setDepartments(departmentRows);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "تعذّر تحميل بيانات الدورة.");
        }
      } finally {
        if (!cancelled) setIsLoadingOptions(false);
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [template]);

  useEffect(() => {
    if (!form.department) {
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
  }, [form.department]);

  const resolvedTemplateId = useMemo(() => {
    if (!template) return null;
    return resolveEvaluationTemplateId(template.title, dbTemplates, template.id);
  }, [template, dbTemplates]);

  const resolvedDbTemplate = useMemo(
    () =>
      dbTemplates.find((row) => String(row.id) === String(resolvedTemplateId)),
    [dbTemplates, resolvedTemplateId],
  );

  const previewSections = useMemo(() => {
    if (!template) return [];
    return buildTemplatePreviewSections({
      questionsJsonb: getTemplatePayload(resolvedDbTemplate),
      uiTemplate: template,
    });
  }, [template, resolvedDbTemplate]);

  const headerTitle = resolvedDbTemplate
    ? getTemplateDisplayTitle(resolvedDbTemplate, "ar")
    : template?.title ?? "";
  const headerDescription =
    getTemplateDescription(resolvedDbTemplate, "ar") ||
    template?.pillarTitle ||
    "معاينة قراءة فقط لمعايير التقييم.";

  if (!template) return null;

  const handleLaunchSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;

    if (!resolvedTemplateId) {
      setError("تعذّر ربط النموذج بقاعدة البيانات. تأكد من مزامنة نماذج التقييم.");
      return;
    }

    if (!templateHasQuestions(resolvedDbTemplate)) {
      setError(
        "هذا النموذج لا يحتوي على أسئلة جاهزة بعد. اختر نموذجاً من المكتبة الجاهزة.",
      );
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await launchEvaluationCycleForDepartment({
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        templateId: resolvedTemplateId,
        department: form.department,
      });
      onCycleLaunched?.(form.name);
      onClose();
    } catch (err) {
      setError(err.message || "تعذّر إطلاق دورة التقييم.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="إغلاق"
        onClick={onClose}
      />

      <div
        dir="rtl"
        lang="ar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-preview-title"
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-none sm:rounded-md"
      >
        <header className="shrink-0 border-b border-gray-200 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-slate-500">
                {step === "launch" ? "إعداد دورة التقييم" : "معاينة النموذج"}
              </p>
              <h2
                id="template-preview-title"
                className="text-lg font-bold text-slate-900"
              >
                {step === "launch" ? form.name || headerTitle : headerTitle}
              </h2>
              {step === "preview" ? (
                <p className="text-sm leading-relaxed text-slate-500">
                  {headerDescription}
                </p>
              ) : (
                <p className="text-sm text-slate-500">النموذج: {headerTitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-gray-200 text-slate-500 hover:bg-gray-50"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </header>

        {step === "preview" ? (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <Eye className="h-3.5 w-3.5" aria-hidden />
                معاينة للقراءة فقط — تُطبَّق على الموظفين عند إطلاق الدورة.
              </p>
              <div className="space-y-4">
                {previewSections.map((section, index) => (
                  <PreviewCategoryBlock
                    key={`${section.title}-${index}`}
                    section={section}
                    index={index}
                  />
                ))}
              </div>
            </div>

            <footer className="sticky bottom-0 shrink-0 border-t border-gray-200 bg-white px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep("launch");
                }}
                className="md-btn-primary min-h-[44px] w-full"
              >
                إطلاق دورة تقييم
              </button>
            </footer>
          </>
        ) : (
          <form onSubmit={handleLaunchSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
              <div className="space-y-2">
                <label htmlFor="launch-cycle-name" className="md-label block">
                  اسم الدورة
                </label>
                <input
                  id="launch-cycle-name"
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={isSaving}
                  required
                  placeholder="مثال: تقييم الربع الأول 2026"
                  className="md-input min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DateInput
                  id="launch-cycle-start"
                  label="تاريخ البداية"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  disabled={isSaving}
                  required
                />
                <DateInput
                  id="launch-cycle-end"
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
                <label htmlFor="launch-cycle-department" className="md-label block">
                  القسم المستهدف (وفق الإدارة)
                </label>
                <select
                  id="launch-cycle-department"
                  value={form.department}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, department: e.target.value }))
                  }
                  disabled={isSaving || isLoadingOptions}
                  required
                  className="md-input min-h-[44px]"
                >
                  <option value="">اختر إدارة</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
                {form.department ? (
                  <p className="text-xs text-slate-500">
                    سيتم إنشاء {targetCount} استجابة تقييم للموظفين في هذه الإدارة.
                  </p>
                ) : null}
              </div>

              {error ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </p>
              ) : null}
            </div>

            <footer className="sticky bottom-0 flex shrink-0 flex-col gap-2 border-t border-gray-200 bg-white px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setStep("preview")}
                disabled={isSaving}
                className="md-btn-tonal min-h-[44px] w-full sm:w-auto"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving || isLoadingOptions}
                className="md-btn-primary min-h-[44px] w-full sm:w-auto sm:min-w-[160px]"
              >
                {isSaving ? "جاري الإطلاق..." : "إطلاق الدورة"}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}
