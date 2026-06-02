import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles, X } from "lucide-react";
import { listActiveEmployees } from "../services/payrollService.js";
import { generateAndAssignSmartTask } from "../services/smartTasksService.js";
import { isRateLimitError } from "../utils/aiRateLimit.js";
import RateLimitToast from "./ui/RateLimitToast.jsx";

function SuccessToast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className="fixed inset-x-4 top-4 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-md sm:inset-x-auto sm:end-6 sm:start-auto sm:top-6 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-100"
    >
      <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-900"
        aria-label="إغلاق"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export default function SmartTasksModal({ isOpen, onClose, onTaskCreated }) {
  const [employees, setEmployees] = useState([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [brief, setBrief] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [rateLimitToast, setRateLimitToast] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;

    async function loadEmployees() {
      setIsLoadingEmployees(true);
      setError("");

      try {
        const rows = await listActiveEmployees();
        if (cancelled) return;
        setEmployees(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "تعذّر تحميل قائمة الموظفين.");
        }
      } finally {
        if (!cancelled) setIsLoadingEmployees(false);
      }
    }

    loadEmployees();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const resetForm = () => {
    setEmployeeId("");
    setBrief("");
    setError("");
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting || !employeeId || !brief.trim()) return;

    const selected = employees.find(
      (employee) => String(employee.id) === String(employeeId),
    );

    setIsSubmitting(true);
    setError("");

    try {
      await generateAndAssignSmartTask({
        employeeId: Number(employeeId),
        employeeName: selected?.full_name ?? "",
        brief,
      });

      setSuccessMessage("تم توليد المهمة وتعيينها بنجاح");
      resetForm();
      onTaskCreated?.();
      onClose();
    } catch (err) {
      if (isRateLimitError(err)) {
        setRateLimitToast(err.message);
      } else {
        setError(err.message || "تعذّر إنشاء المهمة.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen && !successMessage && !rateLimitToast) return null;

  return (
    <>
      <RateLimitToast
        message={rateLimitToast}
        onDismiss={() => setRateLimitToast("")}
      />

      {successMessage ? (
        <SuccessToast
          message={successMessage}
          onDismiss={() => setSuccessMessage("")}
        />
      ) : null}

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="smart-tasks-modal-title"
        >
          <div className="md-surface flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl md:max-w-xl md-elevated">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-exeer-border px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-md-primary-container text-exeer-primary dark:bg-[#1e3a5f] dark:text-[#e2e8f0] sm:h-11 sm:w-11">
                  <Sparkles className="h-5 w-5 stroke-[1.75]" aria-hidden />
                </span>
                <div className="min-w-0 space-y-1">
                  <h2
                    id="smart-tasks-modal-title"
                    className="text-lg font-bold text-exeer-primary sm:text-xl"
                  >
                    المهام الذكية
                  </h2>
                  <p className="text-xs leading-relaxed text-exeer-muted sm:text-sm">
                    حوّل فكرة مختصرة إلى مهمة احترافية مفصّلة بالذكاء الاصطناعي
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-exeer-border bg-md-surface text-exeer-muted transition-colors hover:bg-exeer-hover disabled:opacity-50"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 sm:gap-6 sm:px-6 sm:py-6"
            >
              <div className="space-y-2">
                <label htmlFor="smart-task-employee" className="md-label block">
                  الموظف المكلف
                </label>
                <select
                  id="smart-task-employee"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  disabled={isSubmitting || isLoadingEmployees}
                  className="md-input"
                  required
                >
                  <option value="">
                    {isLoadingEmployees
                      ? "جاري تحميل الموظفين..."
                      : "اختر موظفاً"}
                  </option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="smart-task-brief" className="md-label block">
                  فكرة المهمة
                </label>
                <textarea
                  id="smart-task-brief"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="مثال: تخطيط الاجتماع السنوي للموظفين"
                  disabled={isSubmitting}
                  rows={5}
                  required
                  className="md-input min-h-[120px] resize-y sm:min-h-[140px]"
                />
                <p className="text-xs text-exeer-muted">
                  اكتب فكرة مختصرة — سيُوسّع Gemini النص إلى وصف مهني بالعربية
                  الفصحى.
                </p>
              </div>

              {error ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </p>
              ) : null}

              <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="md-btn-tonal w-full sm:w-auto sm:min-w-[120px]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    isLoadingEmployees ||
                    !employeeId ||
                    !brief.trim()
                  }
                  className="md-btn-primary w-full sm:w-auto sm:min-w-[200px]"
                >
                  {isSubmitting ? "جاري التوليد..." : "توليد وتعيين المهمة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
