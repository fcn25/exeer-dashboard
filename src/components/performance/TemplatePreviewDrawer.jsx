import { useEffect, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { getTemplatePreviewSections } from "../../constants/performanceTemplates.js";
import {
  launchEvaluationCycleForDepartment,
  listCompanyDepartments,
  listEmployeesByDepartment,
  listEvaluationTemplates,
  resolveEvaluationTemplateId,
} from "../../services/performanceService.js";
import {
  getQuestionLabel,
  parseTemplateQuestions,
  QUESTION_TYPES,
  templateHasQuestions,
} from "../../utils/evaluationTemplateQuestions.js";
import { DateInput } from "../ui/DateInput.jsx";

const EMPTY_FORM = {
  name: "",
  startDate: "",
  endDate: "",
  department: "",
};

function PreviewSection({ section, index }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-bold text-exeer-primary">
        {index + 1}. {section.title}
      </h3>
      <ul className="space-y-1.5">
        {section.questions.map((question) => (
          <li
            key={question}
            className="flex items-start gap-2 rounded-md bg-exeer-surface px-3 py-2 text-xs leading-relaxed text-exeer-muted"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-md-primary" aria-hidden />
            <span>{question}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DbQuestionPreview({ questions }) {
  const typeLabels = {
    [QUESTION_TYPES.RATING_1_5]: "تقييم 1–5",
    [QUESTION_TYPES.RATING_0_10]: "تقييم 0–10",
    [QUESTION_TYPES.RATING_0_100]: "تقييم 0–100",
    [QUESTION_TYPES.TEXT]: "نص",
    [QUESTION_TYPES.BOOLEAN]: "نعم / لا",
    [QUESTION_TYPES.CHOICE]: "اختيار",
    [QUESTION_TYPES.FILE]: "مرفق",
  };

  return (
    <ul className="space-y-2">
      {questions.map((question, index) => (
        <li
          key={question.id}
          className="rounded-md bg-exeer-surface px-3 py-2.5 text-xs leading-relaxed"
        >
          <p className="font-semibold text-exeer-primary">
            {index + 1}. {getQuestionLabel(question, "ar")}
          </p>
          <p className="mt-1 text-exeer-muted">
            {typeLabels[question.type] ?? question.type}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function TemplatePreviewDrawer({
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

  if (!template) return null;

  const Icon = template.icon;
  const resolvedTemplateId = resolveEvaluationTemplateId(template.title, dbTemplates);
  const resolvedDbTemplate = dbTemplates.find(
    (row) => String(row.id) === String(resolvedTemplateId),
  );
  const dbQuestions = parseTemplateQuestions(resolvedDbTemplate?.questions_jsonb);
  const previewSections = getTemplatePreviewSections(template);

  const handleLaunchSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;

    if (!resolvedTemplateId) {
      setError("تعذّر ربط النموذج بقاعدة البيانات. تأكد من مزامنة نماذج التقييم.");
      return;
    }

    if (!templateHasQuestions(resolvedDbTemplate)) {
      setError(
        "هذا النموذج لا يحتوي على أسئلة جاهزة بعد. أضف questions_jsonb في Supabase أو اختر نموذجاً من المكتبة الجاهزة.",
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
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/35 backdrop-blur-[2px]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="إغلاق"
        onClick={onClose}
      />

      <aside
        dir="rtl"
        lang="ar"
        className="relative flex h-full w-full max-w-lg flex-col border-s border-gray-200 bg-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-preview-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-exeer-border px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-exeer-surface text-exeer-primary">
              <Icon className="h-5 w-5 stroke-[1.75]" aria-hidden />
            </span>
            <div className="min-w-0 space-y-0.5">
              {step === "launch" ? (
                <button
                  type="button"
                  onClick={() => setStep("preview")}
                  className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-md-primary hover:underline"
                >
                  <ChevronRight className="h-3.5 w-3.5 rotate-180" aria-hidden />
                  العودة للمعاينة
                </button>
              ) : null}
              <h2
                id="template-preview-title"
                className="truncate text-lg font-bold text-exeer-primary"
              >
                {step === "launch" ? "إعداد دورة التقييم" : template.title}
              </h2>
              <p className="truncate text-xs text-exeer-muted">
                {step === "launch"
                  ? `النموذج: ${template.title}`
                  : template.pillarTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {step === "preview" ? (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <p className="text-xs leading-relaxed text-exeer-muted">
                معاينة قراءة فقط لمعايير التقييم — سيتم تطبيقها على الموظفين
                المحدّدين عند إطلاق الدورة.
              </p>

              <div className="space-y-4">
                {dbQuestions.length ? (
                  <DbQuestionPreview questions={dbQuestions} />
                ) : (
                  previewSections.map((section, index) => (
                    <PreviewSection key={section.title} section={section} index={index} />
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-exeer-border px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep("launch");
                }}
                className="md-btn-primary w-full"
              >
                إطلاق دورة تقييم
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleLaunchSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
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
                  className="md-input"
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
                  القسم المستهدف
                </label>
                <select
                  id="launch-cycle-department"
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
                    سيتم إنشاء {targetCount} استجابة تقييم وإرسال إشعار لكل موظف
                    مرتبط بحساب في القسم.
                  </p>
                ) : null}
              </div>

              {error ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 border-t border-exeer-border px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setStep("preview")}
                disabled={isSaving}
                className="md-btn-tonal w-full sm:w-auto sm:min-w-[100px]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving || isLoadingOptions}
                className="md-btn-primary w-full sm:w-auto sm:min-w-[160px]"
              >
                {isSaving ? "جاري الإطلاق..." : "إطلاق الدورة"}
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
}
