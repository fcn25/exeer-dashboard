import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import {
  EVALUATION_CRITERIA,
  EMPTY_RATINGS,
} from "../../constants/evaluationCriteria.js";
import { submitEmployeeEvaluation } from "../../services/performanceService.js";

function StarRating({ value, onChange, disabled, name }) {
  return (
    <div className="flex flex-row-reverse items-center justify-end gap-1">
      {[5, 4, 3, 2, 1].map((rating) => {
        const selected = value === rating;
        return (
          <label
            key={rating}
            className={`cursor-pointer rounded-lg p-1 transition-colors ${
              disabled ? "cursor-not-allowed opacity-60" : "hover:bg-exeer-hover"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={rating}
              checked={selected}
              onChange={() => onChange(rating)}
              disabled={disabled}
              className="sr-only"
            />
            <Star
              className={`h-6 w-6 ${
                selected
                  ? "fill-amber-400 text-amber-400"
                  : "text-exeer-border"
              }`}
              aria-hidden
            />
            <span className="sr-only">{rating}</span>
          </label>
        );
      })}
    </div>
  );
}

export default function TakeEvaluationModal({
  evaluation,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [ratings, setRatings] = useState({ ...EMPTY_RATINGS });
  const [generalComments, setGeneralComments] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setRatings({ ...EMPTY_RATINGS });
    setGeneralComments("");
    setError("");
    setIsSaving(false);
  }, [isOpen, evaluation?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!evaluation?.id || isSaving) return;

    setIsSaving(true);
    setError("");

    try {
      await submitEmployeeEvaluation(evaluation.id, ratings, generalComments);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "تعذّر حفظ التقييم.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !evaluation) return null;

  const templateTitle =
    evaluation.evaluation_templates?.title ?? evaluation.templateTitle ?? "تقييم";
  const cycleName =
    evaluation.evaluation_cycles?.name ?? evaluation.cycleName ?? "—";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="take-evaluation-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="إغلاق"
        onClick={onClose}
      />

      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-t-3xl bg-md-surface sm:rounded-3xl md-elevated">
        <div className="flex items-start justify-between gap-4 border-b border-exeer-border px-6 py-5">
          <div className="space-y-1">
            <h2 id="take-evaluation-title" className="text-xl font-bold text-exeer-primary">
              إجراء التقييم
            </h2>
            <p className="text-sm text-exeer-muted">
              {templateTitle} — {cycleName}
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
            <div className="space-y-4">
              {EVALUATION_CRITERIA.map((criterion) => (
                <div
                  key={criterion.key}
                  className="md-surface-muted flex flex-col gap-3 rounded-2xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-exeer-primary">
                      {criterion.label}
                    </p>
                    <p className="text-xs text-exeer-muted">{criterion.labelEn}</p>
                  </div>
                  <StarRating
                    name={criterion.key}
                    value={ratings[criterion.key]}
                    onChange={(rating) =>
                      setRatings((prev) => ({ ...prev, [criterion.key]: rating }))
                    }
                    disabled={isSaving}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label htmlFor="general-comments" className="md-label block">
                ملاحظات عامة
              </label>
              <textarea
                id="general-comments"
                value={generalComments}
                onChange={(e) => setGeneralComments(e.target.value)}
                disabled={isSaving}
                rows={4}
                placeholder="أضف أي ملاحظات أو توصيات..."
                className="md-input min-h-[120px] resize-y"
              />
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
              disabled={isSaving}
              className="md-btn-primary w-full sm:w-auto sm:min-w-[160px]"
            >
              {isSaving ? "جاري الحفظ..." : "حفظ التقييم"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
