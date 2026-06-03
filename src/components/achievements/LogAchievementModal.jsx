import { useEffect, useState } from "react";
import { Trophy, X } from "lucide-react";
import { DateInput } from "../ui/DateInput.jsx";
import { createEmployeeAchievement } from "../../services/achievementsService.js";

const EMPTY_FORM = {
  title: "",
  description: "",
  achievementDate: "",
};

export default function LogAchievementModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  onSuccess,
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setForm({ ...EMPTY_FORM });
    setError("");
    setIsSaving(false);
  }, [isOpen, employeeId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setError("");

    try {
      await createEmployeeAchievement({
        employeeId,
        title: form.title,
        description: form.description,
        achievementDate: form.achievementDate,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "تعذّر حفظ الإنجاز.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-achievement-title"
    >
      <div className="md-surface w-full max-w-lg rounded-t-md p-6 sm:rounded-md sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <Trophy className="h-5 w-5 stroke-[1.75]" aria-hidden />
            </span>
            <div className="space-y-1">
              <h2
                id="log-achievement-title"
                className="text-lg font-bold text-exeer-primary sm:text-xl"
              >
                إضافة إنجاز
              </h2>
              {employeeName ? (
                <p className="text-sm text-exeer-muted">{employeeName}</p>
              ) : null}
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="achievement-title" className="md-label block">
              عنوان الإنجاز
            </label>
            <input
              id="achievement-title"
              type="text"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="مثال: إتمام مشروع التحول الرقمي"
              disabled={isSaving}
              required
              className="md-input"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="achievement-description" className="md-label block">
              الوصف
            </label>
            <textarea
              id="achievement-description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="صف الإنجاز وتأثيره..."
              disabled={isSaving}
              rows={4}
              required
              className="md-input min-h-[120px] resize-y"
            />
          </div>

          <DateInput
            id="achievement-date"
            label="تاريخ الإنجاز"
            value={form.achievementDate}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                achievementDate: e.target.value,
              }))
            }
            disabled={isSaving}
            required
          />

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
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
              disabled={isSaving}
              className="md-btn-primary w-full sm:w-auto sm:min-w-[160px]"
            >
              {isSaving ? "جاري الحفظ..." : "حفظ الإنجاز"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
