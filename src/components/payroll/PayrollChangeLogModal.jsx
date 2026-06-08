import { X } from "lucide-react";
import PayrollChangeLogPanel from "./PayrollChangeLogPanel.jsx";

export default function PayrollChangeLogModal({
  isOpen,
  onClose,
  entries = [],
  isLoading = false,
  error = "",
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payroll-change-log-title"
        className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-md border border-gray-200 bg-white p-5 shadow-none"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2
            id="payroll-change-log-title"
            className="text-lg font-semibold text-slate-900"
          >
            سجل التعديلات
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 p-2 text-slate-600 hover:bg-gray-50"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <PayrollChangeLogPanel
          title="سجل تعديلات المسير"
          entries={entries}
          isLoading={isLoading}
          error={error}
          compact
        />
      </div>
    </div>
  );
}
