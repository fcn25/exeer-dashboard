import {
  ADMINISTRATIVE_ACTION_TYPE_LABELS,
  SALARY_DEDUCTION_ACTION_TYPE,
} from "../../constants/administrativeActions.js";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

/**
 * @param {{ action: object, showEmployee?: boolean }} props
 */
export default function AdministrativeActionCard({
  action,
  showEmployee = false,
}) {
  const label =
    ADMINISTRATIVE_ACTION_TYPE_LABELS[action.actionType] ?? action.actionType;

  return (
    <article className="rounded-md border border-gray-200 bg-white p-4 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-bold text-slate-900">{label}</p>
          {showEmployee ? (
            <p className="text-xs text-slate-500">{action.employeeName}</p>
          ) : null}
          <p className="text-xs text-slate-500">{formatDate(action.actionDate)}</p>
        </div>
        {action.actionType === SALARY_DEDUCTION_ACTION_TYPE &&
        action.penaltyAmount != null ? (
          <span className="shrink-0 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-900 tabular-nums">
            {Number(action.penaltyAmount).toLocaleString("ar-SA")} ر.س
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">{action.reason}</p>
      <p className="mt-2 text-xs text-slate-500">
        أُصدر بواسطة: {action.issuedByName}
      </p>
    </article>
  );
}
