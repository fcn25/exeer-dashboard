import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { getEmployeeById, updateEmployee } from "../../services/employeesService.js";
import { mapRowToEmployeeForm } from "../employees/employeeFormShared.js";

export default function ProbationDecisionModal({
  isOpen,
  employeeId,
  employeeName,
  probationEndDate,
  onClose,
  onSuccess,
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !employeeId) return null;

  const handleDecision = async (employmentStatus) => {
    setIsSaving(true);
    setError("");

    try {
      const row = await getEmployeeById(employeeId);
      if (!row) throw new Error("لم يتم العثور على الموظف.");
      const form = mapRowToEmployeeForm(row);
      form.employment_status = employmentStatus;
      await updateEmployee(employeeId, form);
      onSuccess?.(
        employmentStatus === "نشط"
          ? `تم تثبيت ${employeeName} بنجاح`
          : `تم إنهاء خدمة ${employeeName}`,
      );
      onClose();
    } catch (err) {
      setError(err.message || "تعذّر حفظ القرار.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="md-surface w-full max-w-md p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-exeer-primary">قرار فترة التجربة</h2>
            <p className="mt-1 text-sm text-exeer-muted">
              {employeeName} — تنتهي التجربة في {probationEndDate}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-exeer-border text-exeer-muted hover:bg-exeer-hover"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {error ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleDecision("نشط")}
            className="md-btn-primary flex-1 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" aria-hidden />
            ) : (
              "تثبيت الموظف"
            )}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleDecision("منتهي")}
            className="md-btn-tonal flex-1 border-red-200 text-red-700 disabled:opacity-50"
          >
            إنهاء الخدمة
          </button>
        </div>
      </div>
    </div>
  );
}
