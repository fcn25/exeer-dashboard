import { X } from "lucide-react";

export default function TakeEvaluationModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evaluation-redesign-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-[var(--bg-surface)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2
            id="evaluation-redesign-title"
            className="text-lg font-semibold text-exeer-primary"
          >
            التقييمات
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-exeer-muted hover:bg-exeer-surface"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="text-sm text-exeer-muted">
          نظام التقييم قيد إعادة البناء. ستتمكن من إكمال التقييمات بعد إطلاق
          النظام الجديد.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-md-primary px-4 py-2.5 text-sm font-medium text-white"
        >
          حسناً
        </button>
      </div>
    </div>
  );
}
