import { useEffect, useState } from "react";
import {
  ADMINISTRATIVE_ACTION_TYPES,
  ADMINISTRATIVE_ACTION_TYPE_LABELS,
  ADMINISTRATIVE_ACTION_WINDOW_DAYS,
} from "../../constants/administrativeActions.js";
import { getEmployeeActionCount } from "../../services/administrativeActionsService.js";
import { isSalaryDeductionAction } from "../../utils/administrativeActions.js";

const CARD_CLASS =
  "rounded-md border border-gray-200 bg-white p-6 shadow-none";

/**
 * @param {{
 *   employees: object[],
 *   onSubmit: (payload: object) => Promise<void>,
 *   isSubmitting?: boolean,
 * }} props
 */
export default function CreateAdministrativeActionForm({
  employees,
  onSubmit,
  isSubmitting = false,
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [actionType, setActionType] = useState(ADMINISTRATIVE_ACTION_TYPES[0]);
  const [reason, setReason] = useState("");
  const [penaltyAmount, setPenaltyAmount] = useState("");
  const [activeCount, setActiveCount] = useState(null);
  const [countLoading, setCountLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const showPenalty = isSalaryDeductionAction(actionType);
  const selectedEmployee = employees.find(
    (e) => String(e.id) === String(employeeId),
  );

  useEffect(() => {
    if (!employeeId) {
      setActiveCount(null);
      return undefined;
    }

    let cancelled = false;
    setCountLoading(true);

    getEmployeeActionCount(employeeId)
      .then((count) => {
        if (!cancelled) setActiveCount(count);
      })
      .catch(() => {
        if (!cancelled) setActiveCount(null);
      })
      .finally(() => {
        if (!cancelled) setCountLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    try {
      await onSubmit({
        employeeId: Number(employeeId),
        actionType,
        reason,
        penaltyAmount: showPenalty ? penaltyAmount : null,
      });
      setReason("");
      setPenaltyAmount("");
      setEmployeeId("");
      setActiveCount(null);
    } catch (err) {
      setFormError(err.message || "تعذّر إصدار الإجراء.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`${CARD_CLASS} space-y-4`}>
      <div className="space-y-1">
        <h2 className="text-base font-bold text-slate-900">إصدار إجراء إداري</h2>
        <p className="text-sm text-slate-500">
          يُرسل مباشرة للموظف دون سلسلة موافقات.
        </p>
      </div>

      <div>
        <label className="md-label mb-2 block" htmlFor="admin-action-employee">
          الموظف
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            id="admin-action-employee"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            required
            disabled={isSubmitting}
            className="md-input min-w-[220px] flex-1"
          >
            <option value="">اختر موظفاً</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}
                {employee.employee_number
                  ? ` — ${employee.employee_number}`
                  : ""}
              </option>
            ))}
          </select>
          {employeeId ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
              title={`إجراءات خلال آخر ${ADMINISTRATIVE_ACTION_WINDOW_DAYS} يوماً`}
            >
              {countLoading ? "…" : `إجراءات نشطة: ${activeCount ?? 0}`}
            </span>
          ) : null}
        </div>
        {selectedEmployee ? (
          <p className="mt-1.5 text-xs text-slate-500">
            {selectedEmployee.department
              ? `القسم: ${selectedEmployee.department}`
              : null}
          </p>
        ) : null}
      </div>

      <div>
        <label className="md-label mb-2 block" htmlFor="admin-action-type">
          نوع الإجراء
        </label>
        <select
          id="admin-action-type"
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
          required
          disabled={isSubmitting}
          className="md-input w-full"
        >
          {ADMINISTRATIVE_ACTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {ADMINISTRATIVE_ACTION_TYPE_LABELS[type] ?? type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="md-label mb-2 block" htmlFor="admin-action-reason">
          السبب
        </label>
        <textarea
          id="admin-action-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          rows={4}
          disabled={isSubmitting}
          className="md-input w-full resize-y"
          placeholder="اشرح سبب الإجراء بوضوح..."
        />
      </div>

      {showPenalty ? (
        <div>
          <label className="md-label mb-2 block" htmlFor="admin-action-penalty">
            مبلغ الخصم (ر.س)
          </label>
          <input
            id="admin-action-penalty"
            type="number"
            min="0"
            step="0.01"
            value={penaltyAmount}
            onChange={(e) => setPenaltyAmount(e.target.value)}
            required
            disabled={isSubmitting}
            className="md-input w-full max-w-xs"
          />
        </div>
      ) : null}

      {formError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !employeeId}
        className="md-btn-primary shadow-none"
      >
        {isSubmitting ? "جاري الإصدار..." : "إصدار الإجراء"}
      </button>
    </form>
  );
}
