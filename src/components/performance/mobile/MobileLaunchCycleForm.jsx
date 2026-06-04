import { useEffect, useState } from "react";
import { DateInput } from "../../ui/DateInput.jsx";
import {
  launchEvaluationCycleForDepartment,
  listCompanyDepartments,
  listEmployeesByDepartment,
  listEvaluationTemplates,
} from "../../../services/performanceService.js";
import {
  getTemplateDisplayTitle,
  templateHasQuestions,
} from "../../../utils/evaluationTemplateQuestions.js";
import { ensureArray } from "../../../utils/ensureArray.js";
import MobileLoadingState from "../../mobile/MobileLoadingState.jsx";

function getTodayIsoDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function MobileLaunchCycleForm({ onSuccess }) {
  const [templates, setTemplates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [department, setDepartment] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetCount, setTargetCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setIsLoading(true);
      setError("");
      try {
        const [templateRows, departmentRows] = await Promise.all([
          listEvaluationTemplates(),
          listCompanyDepartments(),
        ]);
        if (cancelled) return;
        setTemplates(
          ensureArray(templateRows).filter((row) => row && templateHasQuestions(row)),
        );
        setDepartments(ensureArray(departmentRows));
      } catch (err) {
        if (!cancelled) setError(err.message || "تعذّر تحميل البيانات.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!department) {
      setTargetCount(0);
      return undefined;
    }

    let cancelled = false;

    async function loadCount() {
      try {
        const rows = ensureArray(await listEmployeesByDepartment(department));
        if (!cancelled) setTargetCount(rows.length);
      } catch {
        if (!cancelled) setTargetCount(0);
      }
    }

    loadCount();
    return () => {
      cancelled = true;
    };
  }, [department]);

  const safeTemplates = ensureArray(templates);
  const safeDepartments = ensureArray(departments);

  const selectedTemplate = safeTemplates.find(
    (row) => String(row?.id) === String(templateId),
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;

    if (!templateId) {
      setError("يرجى اختيار نموذج التقييم.");
      return;
    }
    if (!department) {
      setError("يرجى اختيار الإدارة المستهدفة.");
      return;
    }
    if (!endDate) {
      setError("يرجى تحديد موعد انتهاء الدورة.");
      return;
    }

    const startDate = getTodayIsoDate();
    if (new Date(endDate) < new Date(startDate)) {
      setError("موعد الانتهاء يجب أن يكون اليوم أو بعده.");
      return;
    }

    const cycleName =
      `تقييم ${department} — ${endDate.replaceAll("-", "/")}`.trim();

    setIsSaving(true);
    setError("");

    try {
      await launchEvaluationCycleForDepartment({
        name: cycleName,
        startDate,
        endDate,
        templateId: Number(templateId),
        department,
      });
      setTemplateId("");
      setDepartment("");
      setEndDate("");
      onSuccess?.();
    } catch (err) {
      setError(err.message || "تعذّر إطلاق دورة التقييم.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <MobileLoadingState label="جاري تحميل خيارات الإطلاق..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500">الخطوة 1</p>
        <label htmlFor="mobile-launch-template" className="md-label block">
          نموذج التقييم
        </label>
        <select
          id="mobile-launch-template"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          disabled={isLoading || isSaving}
          required
          className="md-input min-h-[44px] w-full"
        >
          <option value="">
            {isLoading ? "جاري التحميل..." : "اختر النموذج"}
          </option>
          {safeTemplates.map((row) => (
            <option key={row?.id ?? row?.title} value={row?.id ?? ""}>
              {getTemplateDisplayTitle(row, "ar")}
            </option>
          ))}
        </select>
        {selectedTemplate ? (
          <p className="text-xs text-slate-500">
            {selectedTemplate?.category
              ? `التصنيف: ${selectedTemplate.category}`
              : null}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500">الخطوة 2</p>
        <label htmlFor="mobile-launch-department" className="md-label block">
          الإدارة المستهدفة (وفق الإدارة)
        </label>
        <select
          id="mobile-launch-department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          disabled={isLoading || isSaving}
          required
          className="md-input min-h-[44px] w-full"
        >
          <option value="">اختر الإدارة</option>
          {safeDepartments.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {department ? (
          <p className="text-xs text-slate-500">
            {targetCount} موظفاً سيتلقون التقييم في هذه الإدارة.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500">الخطوة 3</p>
        <DateInput
          id="mobile-launch-deadline"
          label="موعد انتهاء الدورة"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          disabled={isSaving}
          required
        />
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSaving}
        className="md-btn-primary min-h-[48px] w-full"
      >
        {isSaving ? "جاري الإطلاق..." : "إطلاق دورة التقييم"}
      </button>
    </form>
  );
}
