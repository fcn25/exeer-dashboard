import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ClipboardList,
  Target,
} from "lucide-react";
import EmergencyAlertsPanel from "../../home/EmergencyAlertsPanel.jsx";
import PendingRequestCard from "../../requests/PendingRequestCard.jsx";
import ProbationDecisionModal from "../../home/ProbationDecisionModal.jsx";
import {
  HOME_BTN,
  HOME_BTN_PRIMARY,
  HOME_SHELL,
  HOME_TEXT_BODY,
  HOME_TEXT_HEADING,
  HOME_TEXT_HINT,
  HOME_TEXT_LABEL,
  PRIORITY_ICON_STYLES,
} from "../../home/homeStyles.js";
import {
  approveEmployeeRequest,
  rejectEmployeeRequest,
} from "../../../services/requestApprovalService.js";
import { useAppLocale } from "../../../i18n/useAppLocale.js";
import MobileManagerQuickTools from "./MobileManagerQuickTools.jsx";
import { canAccessStrategicAI } from "../../../utils/rbac.js";

const ACTION_ICONS = {
  iqama: AlertTriangle,
  probation: CalendarClock,
  requests: ClipboardList,
  evaluation: Target,
};

function ActionItemRow({
  item,
  onAction,
  actingRequestId,
  onApproveRequest,
  onRejectRequest,
}) {
  if (item.type === "request" && item.request) {
    return (
      <PendingRequestCard
        request={item.request}
        employeeName={item.employeeName}
        actingRequestId={actingRequestId}
        onApprove={onApproveRequest}
        onReject={onRejectRequest}
        compact
      />
    );
  }

  const Icon = ACTION_ICONS[item.type] ?? AlertTriangle;
  const iconStyle = PRIORITY_ICON_STYLES[item.priority] ?? PRIORITY_ICON_STYLES.gray;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconStyle}`}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 text-start">
          <p className={`text-[13px] font-medium ${HOME_TEXT_BODY}`}>{item.title}</p>
          <p className={`mt-0.5 text-[12px] ${HOME_TEXT_LABEL}`}>{item.detail}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onAction(item)}
        className={`${HOME_BTN} ${HOME_BTN_PRIMARY} w-full shrink-0 sm:w-auto`}
      >
        {item.actionLabel}
      </button>
    </div>
  );
}

export default function MobileManagerHomeContent({
  homeEssentials,
  isLoading,
  onRefresh,
}) {
  const { t } = useAppLocale();
  const navigate = useNavigate();
  const [actingRequestId, setActingRequestId] = useState(null);
  const [requestActionError, setRequestActionError] = useState("");
  const [probationModal, setProbationModal] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const actionItems = homeEssentials?.actionItems ?? [];
  const emergencyAlerts = homeEssentials?.emergencyAlerts;

  const handleApproveRequest = async (requestId) => {
    setActingRequestId(requestId);
    setRequestActionError("");
    try {
      await approveEmployeeRequest(requestId);
      setSuccessMessage("تمت الموافقة على الطلب.");
      await onRefresh?.();
    } catch (err) {
      setRequestActionError(err.message || "تعذّر اعتماد الطلب.");
    } finally {
      setActingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId) => {
    setActingRequestId(requestId);
    setRequestActionError("");
    try {
      await rejectEmployeeRequest(requestId);
      setSuccessMessage("تم رفض الطلب.");
      await onRefresh?.();
    } catch (err) {
      setRequestActionError(err.message || "تعذّر رفض الطلب.");
    } finally {
      setActingRequestId(null);
    }
  };

  const handleActionItem = useCallback(
    (item) => {
      if (item.type === "probation") {
        setProbationModal({
          employeeId: item.employeeId,
          employeeName: item.employeeName,
          probationEndDate: item.probationEndDate,
        });
        return;
      }
      if (item.href) {
        navigate(item.href);
        return;
      }
      if (item.employeeId) {
        navigate(`/dashboard/employees?employee=${item.employeeId}`);
      }
    },
    [navigate],
  );

  const handleProbationSuccess = async () => {
    setProbationModal(null);
    setSuccessMessage("تم تحديث حالة فترة التجربة.");
    await onRefresh?.();
  };

  return (
    <div className="space-y-5">
      {successMessage ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {successMessage}
        </p>
      ) : null}

      <EmergencyAlertsPanel
        alerts={emergencyAlerts}
        isLoading={isLoading}
        onProbationDecision={(item) =>
          setProbationModal({
            employeeId: item.employeeId,
            employeeName: item.employeeName,
            probationEndDate: item.probationEndDate,
          })
        }
        onViewEmployee={(employeeId) =>
          navigate(`/dashboard/employees?employee=${employeeId}`)
        }
      />

      <section
        className={`${HOME_SHELL} border-r-[3px] border-r-[#0F172A] p-4 dark:border-r-[var(--text-primary)]`}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className={`text-base font-semibold ${HOME_TEXT_HEADING}`}>
            {t("pages.home.needsAttention")}
          </h2>
          {!isLoading && actionItems.length > 0 ? (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C] dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-error)]">
              {actionItems.length}
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <p className={`py-8 text-center text-[13px] ${HOME_TEXT_HINT}`}>
            {t("common.loading")}
          </p>
        ) : actionItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Check className="h-9 w-9 text-emerald-500" aria-hidden />
            <p className={`text-[13px] ${HOME_TEXT_LABEL}`}>{t("pages.home.allClear")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {requestActionError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {requestActionError}
              </p>
            ) : null}
            {actionItems.map((item, index) => (
              <div
                key={item.id}
                className={
                  index < actionItems.length - 1
                    ? "border-b border-exeer-border pb-4 dark:border-[var(--border-color)]"
                    : ""
                }
              >
                <ActionItemRow
                  item={item}
                  onAction={handleActionItem}
                  actingRequestId={actingRequestId}
                  onApproveRequest={handleApproveRequest}
                  onRejectRequest={handleRejectRequest}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <MobileManagerQuickTools showSmartTools={canAccessStrategicAI()} />

      <ProbationDecisionModal
        isOpen={Boolean(probationModal)}
        employeeId={probationModal?.employeeId}
        employeeName={probationModal?.employeeName}
        probationEndDate={probationModal?.probationEndDate}
        onClose={() => setProbationModal(null)}
        onSuccess={handleProbationSuccess}
      />
    </div>
  );
}
