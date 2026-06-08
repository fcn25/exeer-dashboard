import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

export default function PayrollTransitionConfirmDialog({
  isOpen,
  variant = "simple",
  title,
  message,
  warning,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  isSubmitting = false,
  onConfirm,
  onClose,
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setAcknowledged(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isLockVariant = variant === "lock";
  const canConfirm = !isSubmitting && (!isLockVariant || acknowledged);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-md border border-gray-200 bg-white p-6 shadow-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md border border-gray-200 p-2 text-slate-600 hover:bg-gray-50 disabled:opacity-50"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-slate-700">{message}</p>

        {isLockVariant ? (
          <div className="mt-4 space-y-3 rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-900">
              {warning ??
                "بعد القفل لا يمكن تعديل الأرقام أو إرجاع المسير. هذا الإجراء نهائي."}
            </p>
            <label className="flex items-start gap-2 text-sm text-red-900">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="mt-0.5"
              />
              <span>أؤكد أن الأرقام نهائية ولا يمكن تعديلها بعد القفل</span>
            </label>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 ${
              isLockVariant
                ? "bg-red-700 hover:bg-red-800"
                : "bg-slate-900 hover:bg-slate-800"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                جاري التنفيذ...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
