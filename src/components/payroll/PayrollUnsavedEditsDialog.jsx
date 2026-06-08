import { Loader2 } from "lucide-react";

export default function PayrollUnsavedEditsDialog({
  isOpen,
  isSaving = false,
  onSaveAndContinue,
  onDiscardAndContinue,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-md border border-amber-200 bg-white p-6 shadow-none"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-900">
          تعديلات غير محفوظة
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          لديك تعديلات غير محفوظة. حفظ قبل الخروج؟
        </p>
        <p className="mt-2 text-xs text-slate-500">
          يُحفظ كل حقل تلقائياً عند الخروج منه. يمكنك حفظ التعديلات المعلقة
          الآن أو المتابعة بدون حفظها.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-gray-50 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onDiscardAndContinue}
            disabled={isSaving}
            className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            متابعة بدون حفظ
          </button>
          <button
            type="button"
            onClick={onSaveAndContinue}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                جاري الحفظ...
              </>
            ) : (
              "حفظ والمتابعة"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
