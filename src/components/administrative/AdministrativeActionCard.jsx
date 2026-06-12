import {
  ADMINISTRATIVE_ACTION_TYPE_LABELS,
  SALARY_DEDUCTION_ACTION_TYPE,
} from "../../constants/administrativeActions.js";
import { formatLocaleDate } from "../../i18n/formatLocale.js";

function formatDate(value) {
  return formatLocaleDate(value, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * @param {{ action: object, showEmployee?: boolean }} props
 */
export default function AdministrativeActionCard({
  action,
  showEmployee = false,
  embedded = false,
}) {
  if (!action || typeof action !== "object") return null;

  const label =
    ADMINISTRATIVE_ACTION_TYPE_LABELS[action?.actionType] ??
    action?.actionType ??
    "—";

  return (
    <article
      className={
        embedded
          ? ""
          : "rounded-md border border-gray-200 bg-white p-4 shadow-none dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]">
            {label}
          </p>
          {showEmployee ? (
            <p className="text-xs text-exeer-muted dark:text-[var(--text-secondary)]">
              {action?.employeeName ?? "—"}
            </p>
          ) : null}
          <p className="text-xs text-exeer-muted dark:text-[var(--text-secondary)]">
            {formatDate(action?.actionDate)}
          </p>
        </div>
        {action?.actionType === SALARY_DEDUCTION_ACTION_TYPE &&
        action?.penaltyAmount != null ? (
          <span className="shrink-0 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-900 tabular-nums">
            {Number(action.penaltyAmount).toLocaleString("ar-SA")} ر.س
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">
        {action?.reason ?? "—"}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        أُصدر بواسطة: {action?.issuedByName ?? "—"}
      </p>
    </article>
  );
}
