import { Check, ClipboardList, X } from "lucide-react";
import { formatLocaleDate } from "../../i18n/formatLocale.js";
import { buildRequestSummary, resolveRequestTypeLabel } from "../../utils/requestDetails.js";
import { HOME_BTN, PRIORITY_ICON_STYLES } from "../home/homeStyles.js";

export default function PendingRequestCard({
  request,
  employeeName,
  actingRequestId,
  onApprove,
  onReject,
  showActions = true,
  compact = false,
}) {
  if (!request) return null;

  const summary = buildRequestSummary(request);
  const typeLabel = resolveRequestTypeLabel(request.request_type);
  const isActing = actingRequestId === request.id;
  const iconStyle = PRIORITY_ICON_STYLES.orange ?? PRIORITY_ICON_STYLES.gray;

  return (
    <div className={`flex flex-col gap-3 ${compact ? "" : "py-1.5"} sm:flex-row sm:items-start sm:justify-between`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={`flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full ${iconStyle}`}
        >
          <ClipboardList className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 text-start">
          <p className="text-[14px] font-medium text-[#0F172A] dark:text-[var(--text-primary)]">
            {employeeName ?? "موظف"} — {typeLabel}
          </p>
          <p className="mt-0.5 text-[12px] text-[#94A3B8] dark:text-[var(--text-secondary)]">
            {formatLocaleDate(request.created_at, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[#334155] dark:text-[var(--text-primary)]">
            {summary}
          </pre>
        </div>
      </div>

      {showActions ? (
        <div className="flex shrink-0 flex-wrap gap-2 sm:pt-1">
          <button
            type="button"
            disabled={isActing}
            onClick={() => onApprove?.(request.id)}
            className={`${HOME_BTN} inline-flex items-center gap-1.5 rounded-full bg-[#0F172A] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50`}
          >
            <Check className="h-4 w-4" aria-hidden />
            موافقة
          </button>
          <button
            type="button"
            disabled={isActing}
            onClick={() => onReject?.(request.id)}
            className={`${HOME_BTN} inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-[13px] font-medium text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-50 dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-surface-hover)]`}
          >
            <X className="h-4 w-4" aria-hidden />
            رفض
          </button>
        </div>
      ) : null}
    </div>
  );
}
