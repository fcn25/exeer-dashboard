import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ClipboardList,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { canAccessStrategicAI, canViewPayroll } from "../utils/rbac.js";
import { SMART_TOOLS } from "../constants/smartTools.js";
import { useSmartToolsModals } from "../hooks/useSmartToolsModals.js";
import SmartToolsModals from "../components/smart-tools/SmartToolsModals.jsx";
import { getUserDisplay } from "../utils/mobileAuth.js";
import { fetchHomeDashboardData } from "../services/homeDashboardService.js";
import EmergencyAlertsPanel from "../components/home/EmergencyAlertsPanel.jsx";
import PendingRequestCard from "../components/requests/PendingRequestCard.jsx";
import {
  approveEmployeeRequest,
  rejectEmployeeRequest,
} from "../services/requestApprovalService.js";
import ProbationDecisionModal from "../components/home/ProbationDecisionModal.jsx";
import SparkLine from "../components/home/SparkLine.jsx";
import {
  HOME_BTN,
  HOME_BTN_PRIMARY,
  HOME_CARD,
  HOME_LIST_DIVIDE,
  HOME_LIST_ITEM,
  HOME_SURFACE,
  HOME_TEXT_BODY,
  HOME_TEXT_HEADING,
  HOME_TEXT_HINT,
  HOME_TEXT_LABEL,
  HOME_TEXT_TITLE,
  PRIORITY_ICON_STYLES,
  TYPE_META,
  TYPE_SECTION,
} from "../components/home/homeStyles.js";
import { useAppLocale } from "../i18n/useAppLocale.js";
import {
  formatLocaleHeaderDate,
  formatLocaleNumber,
} from "../i18n/formatLocale.js";
import {
  AgentDrawer,
  DashboardHeaderActions,
  QueryPanel,
} from "../features/agent/index.js";
import { ENABLE_AI_AGENT } from "../constants/featureFlags.js";
import { hasQuickCreateAccess } from "../constants/quickCreateActions.ts";
import { roleHasNavKey } from "../constants/roleNav.js";
import { useAuth } from "../context/AuthContext.jsx";

const ACTION_ICONS = {
  iqama: AlertTriangle,
  probation: CalendarClock,
  requests: ClipboardList,
  evaluation: Target,
};

function getGreeting(t) {
  const hour = new Date().getHours();
  if (hour < 12) return t("pages.home.greetingMorning");
  if (hour < 17) return t("pages.home.greetingAfternoon");
  return t("pages.home.greetingEvening");
}

function splitMoneyParts(value) {
  const amount = Number(value) || 0;
  const fixed = amount.toFixed(2);
  const [integerPart, decimalPart] = fixed.split(".");
  return {
    integer: formatLocaleNumber(integerPart),
    decimal: `.${decimalPart}`,
  };
}

function PayrollSubMetric({ label, value, color, isLoading = false, currencyLabel }) {
  const display = isLoading
    ? "0"
    : formatLocaleNumber(value, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

  return (
    <div className="min-w-0 flex-1">
      <p className={`${HOME_TEXT_LABEL}`}>{label}</p>
      <p
        className="mt-1 text-[18px] font-semibold tabular-nums"
        style={{ color }}
      >
        {display} {currencyLabel}
      </p>
    </div>
  );
}

function DeltaBadge({ value, className = "" }) {
  if (value == null) return null;
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ${className}`}
      style={{
        backgroundColor: isPositive ? "#ECFDF5" : "#FEE2E2",
        color: isPositive ? "#047857" : "#B91C1C",
      }}
    >
      <TrendingUp
        className={`h-3.5 w-3.5 ${isPositive ? "" : "rotate-180"}`}
        aria-hidden
      />
      {isPositive && value > 0 ? "+" : ""}
      {value}%
    </span>
  );
}

function SplitMoneyValue({ value, suffix, isLoading = false }) {
  if (isLoading) {
    return (
      <p className="tabular-nums">
        <span className={`text-[34px] font-semibold ${HOME_TEXT_TITLE}`}>0</span>
        <span className={`text-[20px] font-normal ${HOME_TEXT_HINT}`}>.00</span>
        <span className={`ms-1 text-[16px] font-normal ${HOME_TEXT_LABEL}`}>{suffix}</span>
      </p>
    );
  }

  const { integer, decimal } = splitMoneyParts(value);
  return (
    <p className="tabular-nums">
      <span className={`text-[34px] font-semibold ${HOME_TEXT_TITLE}`}>{integer}</span>
      <span className={`text-[20px] font-normal ${HOME_TEXT_HINT}`}>{decimal}</span>
      <span className={`ms-1 text-[16px] font-normal ${HOME_TEXT_LABEL}`}>{suffix}</span>
    </p>
  );
}

function PulsePill({ label, bg, color }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-medium"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  );
}

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
      />
    );
  }

  const Icon = ACTION_ICONS[item.type] ?? AlertTriangle;
  const iconStyle = PRIORITY_ICON_STYLES[item.priority] ?? PRIORITY_ICON_STYLES.gray;

  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={`flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full ${iconStyle}`}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 text-start">
          <p className={HOME_TEXT_BODY}>{item.title}</p>
          <p className={`${TYPE_META} mt-0.5`}>{item.detail}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onAction(item)}
        className={`${HOME_BTN} ${HOME_BTN_PRIMARY} shrink-0`}
      >
        {item.actionLabel}
      </button>
    </div>
  );
}

function MiniStatCard({ label, value, sublabel, sparkline }) {
  return (
    <article className={`${HOME_SURFACE} p-4`}>
      <p className={HOME_TEXT_LABEL}>{label}</p>
      <p className={`mt-1 text-[22px] font-semibold tabular-nums ${HOME_TEXT_TITLE}`}>{value}</p>
      {sublabel ? (
        <p className={`${TYPE_META} mt-0.5 opacity-80`}>{sublabel}</p>
      ) : null}
      <SparkLine data={sparkline} height={40} className="mt-2" />
    </article>
  );
}

export default function HomePage() {
  const { t } = useAppLocale();
  const navigate = useNavigate();
  const { role } = useAuth();
  const user = getUserDisplay();
  const headerDate = formatLocaleHeaderDate();
  const showHeaderActions =
    hasQuickCreateAccess(role) || roleHasNavKey(role, "home");
  const [isExecutorOpen, setIsExecutorOpen] = useState(false);
  const [isQueryOpen, setIsQueryOpen] = useState(false);
  const [executorPrefill, setExecutorPrefill] = useState("");
  const [executorPrefillKey, setExecutorPrefillKey] = useState(0);
  const openExecutor = useCallback((prefill = "") => {
    setIsQueryOpen(false);
    setExecutorPrefill(String(prefill ?? ""));
    setExecutorPrefillKey((key) => key + 1);
    setIsExecutorOpen(true);
  }, []);
  const { resolveToolAction, modalProps } = useSmartToolsModals();
  const showPayroll = canViewPayroll();

  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [probationModal, setProbationModal] = useState(null);
  const [actingRequestId, setActingRequestId] = useState(null);
  const [requestActionError, setRequestActionError] = useState("");
  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchHomeDashboardData({ includePayroll: showPayroll });
      setDashboard(data);
    } catch {
      setDashboard(null);
    } finally {
      setIsLoading(false);
    }
  }, [showPayroll]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleApproveRequest = async (requestId) => {
    setActingRequestId(requestId);
    setRequestActionError("");
    try {
      await approveEmployeeRequest(requestId);
      setSuccessMessage("تمت الموافقة على الطلب وتسجيله في النظام.");
      await loadDashboard();
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
      await loadDashboard();
    } catch (err) {
      setRequestActionError(err.message || "تعذّر رفض الطلب.");
    } finally {
      setActingRequestId(null);
    }
  };

  const handleActionItem = (item) => {
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
  };

  const actionItems = dashboard?.actionItems ?? [];
  const emergencyAlerts = dashboard?.emergencyAlerts;
  const stats = dashboard?.smartStats;
  const pulse = dashboard?.todayPulse;
  const payrollHero = dashboard?.payrollHero;

  const workingCount = isLoading ? 0 : (pulse?.working ?? 0);
  const leaveCount = isLoading ? 0 : (pulse?.onLeave ?? 0);
  const lateCount = isLoading ? 0 : (pulse?.late ?? 0);

  const employeeTotal = stats?.employeeCount ?? 0;
  const saudiCount = stats?.saudiCount ?? 0;
  const nonSaudiCount = stats?.nonSaudiCount ?? 0;
  const saudiPercent =
    employeeTotal > 0 ? Math.round((saudiCount / employeeTotal) * 100) : 0;
  const nonSaudiPercent =
    employeeTotal > 0 ? Math.round((nonSaudiCount / employeeTotal) * 100) : 0;

  const payrollTotal = payrollHero?.total ?? 0;
  const payrollMonthLabel =
    payrollHero?.monthLabel ?? stats?.payrollMonthLabel ?? "الشهر";
  const totalDeductions = payrollHero?.totalDeductions ?? 0;
  const totalOvertime = payrollHero?.totalOvertime ?? 0;

  return (
    <div className="-mx-6 -my-8 flex flex-col gap-8 bg-md-surface-dim px-6 py-8 dark:bg-[var(--bg-main)] md:-mx-8 md:px-8">
      {showHeaderActions ? (
        <div className="flex w-full justify-end rtl:justify-start">
          <DashboardHeaderActions
            onOpenExecutor={() => openExecutor("")}
            onOpenQuery={() => setIsQueryOpen(true)}
          />
        </div>
      ) : null}

      {/* ─── 1. ترويسة ─── */}
      <header className={HOME_CARD}>
        <div className="flex flex-col gap-4">
          <div className="space-y-1 text-start">
            <p className={HOME_TEXT_LABEL}>{getGreeting(t)}</p>
            <h1 className={`text-[24px] font-semibold ${HOME_TEXT_TITLE}`}>{user.name}</h1>
            <p className={HOME_TEXT_HINT}>{headerDate}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <PulsePill
              label={`${formatLocaleNumber(workingCount)} ${t("pages.home.workingToday")}`}
              bg="#ECFDF5"
              color="#047857"
            />
            <PulsePill
              label={`${formatLocaleNumber(leaveCount)} ${t("pages.home.onLeave")}`}
              bg="#FEF3C7"
              color="#92400E"
            />
            <PulsePill
              label={`${formatLocaleNumber(lateCount)} ${t("pages.home.late")}`}
              bg="#F1F5F9"
              color="#475569"
            />
          </div>
        </div>
      </header>

      {ENABLE_AI_AGENT ? (
        <AgentDrawer
          isOpen={isExecutorOpen}
          onClose={() => setIsExecutorOpen(false)}
          initialPrefill={executorPrefill}
          prefillKey={executorPrefillKey}
        />
      ) : null}

      <QueryPanel
        isOpen={isQueryOpen}
        onClose={() => setIsQueryOpen(false)}
      />

      {successMessage ? (
        <p className={`${HOME_CARD} px-4 py-3 text-[13px] font-normal text-[#047857]`}
          style={{ backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }}
        >
          {successMessage}
        </p>
      ) : null}

      {/* ─── تنبيهات طارئة ─── */}
      <EmergencyAlertsPanel
        alerts={emergencyAlerts}
        isLoading={isLoading}
        showImportantTab
        onProbationDecision={(item) =>
          setProbationModal({
            employeeId: item.employeeId,
            employeeName: item.employeeName ?? item.fullName,
            probationEndDate: item.probationEndDate ?? item.endDate,
          })
        }
        onViewEmployee={(employeeId) =>
          navigate(`/dashboard/employees?employee=${employeeId}`)
        }
      />

      {/* ─── 2. صف هيرو 60/40 ─── */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_2fr]">
        <article className={HOME_CARD}>
          <p className={`${HOME_TEXT_LABEL} font-normal`}>
            {t("pages.home.payrollTotal", { month: payrollMonthLabel })}
          </p>

          <div className="mt-2">
            <SplitMoneyValue
              value={payrollTotal}
              suffix={` ${t("common.sar")}`}
              isLoading={isLoading}
            />
          </div>

          {!isLoading && !payrollHero?.hasData ? (
            <p className={`${HOME_TEXT_HINT} mt-1`}>
              {t("pages.home.noPayrollYet")}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DeltaBadge value={payrollHero?.percentChange ?? null} />
            {payrollHero?.percentChange != null ? (
              <span className={HOME_TEXT_HINT}>
                {t("pages.home.vsLastMonth")}
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PayrollSubMetric
              label={t("pages.home.totalDeductions")}
              value={totalDeductions}
              color="#EF4444"
              isLoading={isLoading}
              currencyLabel={t("common.sar")}
            />
            <PayrollSubMetric
              label={t("pages.home.totalOvertime")}
              value={totalOvertime}
              color="#10B981"
              isLoading={isLoading}
              currencyLabel={t("common.sar")}
            />
          </div>
        </article>

        <article className={HOME_CARD}>
          <h2 className={HOME_TEXT_HEADING}>
            {t("pages.home.workforceTitle")}
          </h2>
          <p className={`${HOME_TEXT_HINT} mt-1`}>
            {isLoading
              ? t("common.loading")
              : stats?.hasEmployeeData
                ? t("pages.home.activeEmployees", {
                    count: formatLocaleNumber(employeeTotal),
                  })
                : t("pages.home.noEmployeesYet")}
          </p>

          <ul className={`${HOME_LIST_DIVIDE} mt-5`}>
            <li className={`${HOME_LIST_ITEM} flex items-center justify-between gap-3`}>
              <div className={`flex items-center gap-2 ${HOME_TEXT_BODY}`}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ECFDF5] text-[#047857] dark:bg-emerald-950/50 dark:text-emerald-300">
                  <Users className="h-4 w-4" aria-hidden />
                </span>
                {t("pages.home.saudi")}
              </div>
              <div className="text-end">
                <p className={`${HOME_TEXT_TITLE} tabular-nums`}>
                  {formatLocaleNumber(saudiPercent)}%
                </p>
                <p className={HOME_TEXT_LABEL}>
                  {t("pages.home.employeeCount", {
                    count: formatLocaleNumber(saudiCount),
                  })}
                </p>
              </div>
            </li>
            <li className={`${HOME_LIST_ITEM} flex items-center justify-between gap-3`}>
              <div className={`flex items-center gap-2 ${HOME_TEXT_BODY}`}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9] text-[#475569] dark:bg-slate-800 dark:text-white">
                  <Users className="h-4 w-4" aria-hidden />
                </span>
                {t("pages.home.nonSaudi")}
              </div>
              <div className="text-end">
                <p className={`${HOME_TEXT_TITLE} tabular-nums`}>
                  {formatLocaleNumber(nonSaudiPercent)}%
                </p>
                <p className={HOME_TEXT_LABEL}>
                  {t("pages.home.employeeCount", {
                    count: formatLocaleNumber(nonSaudiCount),
                  })}
                </p>
              </div>
            </li>
          </ul>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#F1F5F9] dark:bg-slate-800">
            <div className="flex h-full w-full">
              <div
                className="h-full bg-[#0F172A] dark:bg-[var(--text-primary)]"
                style={{ width: `${saudiPercent}%` }}
              />
              <div
                className="h-full bg-[#94A3B8] dark:bg-slate-500"
                style={{ width: `${nonSaudiPercent}%` }}
              />
            </div>
          </div>
        </article>
      </section>

      {/* ─── 3. يحتاج اهتمامك ─── */}
      <section className={`${HOME_CARD} border-r-[3px] border-r-[#0F172A] dark:border-r-[var(--text-primary)]`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className={`${TYPE_SECTION} text-[1.125rem]`}>
            {t("pages.home.needsAttention")}
          </h2>
          {!isLoading && actionItems.length > 0 ? (
            <span
              className="inline-flex min-w-6 items-center justify-center rounded-full px-2.5 py-0.5 text-[12px] font-medium"
              style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
            >
              {actionItems.length}
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <p className={`${HOME_TEXT_HINT} py-6 text-center`}>
            {t("common.loading")}
          </p>
        ) : actionItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Check className="h-10 w-10 text-[#10B981] dark:text-emerald-400" aria-hidden />
            <p className={HOME_TEXT_LABEL}>
              {t("pages.home.allClear")}
            </p>
          </div>
        ) : (
          <>
            {requestActionError ? (
              <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {requestActionError}
              </p>
            ) : null}
            <div className={HOME_LIST_DIVIDE}>
              {actionItems.map((item) => (
                <div key={item.id} className={HOME_LIST_ITEM}>
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
          </>
        )}
      </section>

      {/* ─── 4. شريط 4 إحصائيات ─── */}
      <section
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        aria-label="إحصائيات مصغّرة"
      >
        <MiniStatCard
          label={t("pages.home.attendanceRate")}
          value={
            isLoading || !stats
              ? "0%"
              : stats.hasAttendanceData
                ? `${stats.attendanceRate}%`
                : "0%"
          }
          sublabel={stats?.hasAttendanceData ? null : t("pages.home.noAttendanceData")}
          sparkline={stats?.attendanceSparkline}
        />
        <MiniStatCard
          label={t("pages.home.totalEmployees")}
          value={isLoading || !stats ? "0" : formatLocaleNumber(stats.employeeCount)}
          sublabel={
            stats?.hasEmployeeData
              ? `${formatLocaleNumber(stats.saudiCount)} ${t("pages.home.saudi")} · ${formatLocaleNumber(stats.nonSaudiCount)} ${t("pages.home.nonSaudi")}`
              : t("pages.home.noEmployeesYet")
          }
        />
        <MiniStatCard
          label={t("pages.home.avgTenure")}
          value={
            isLoading || !stats
              ? "—"
              : stats.hasTenureData
                ? stats.tenureLabel
                : "—"
          }
          sublabel={stats?.hasTenureData ? null : t("pages.home.noHireDates")}
        />
        <MiniStatCard
          label={t("pages.home.monthlyRequests")}
          value={
            isLoading || !stats ? "0" : formatLocaleNumber(stats.monthlyRequestsCount)
          }
          sublabel={
            stats?.hasMonthlyRequestsData ? null : t("pages.home.noRequestsMonth")
          }
          sparkline={stats?.monthlyRequestsSparkline}
        />
      </section>

      {/* ─── 5. المهام الذكية ─── */}
      {canAccessStrategicAI() ? (
        <section className="mt-10 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#4F46E5]" aria-hidden />
            <h2 className={HOME_TEXT_HEADING}>
              {t("pages.home.smartTasks")}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SMART_TOOLS.map((task) => {
              const onClick = resolveToolAction(task.id);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={onClick}
                  disabled={!onClick}
                  className={`${HOME_CARD} relative flex min-h-[128px] flex-col items-start gap-3 text-start hover:bg-[#F7F6F3] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800`}
                >
                  <span className="inline-flex items-center rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-medium text-[#4F46E5] dark:bg-indigo-950/50 dark:text-indigo-300">
                    ✨ AI
                  </span>
                  <task.icon className={`h-5 w-5 ${HOME_TEXT_BODY}`} aria-hidden />
                  <span className="min-w-0">
                    <span className={`block ${HOME_TEXT_BODY}`}>
                      {task.label}
                    </span>
                    <span className={`${TYPE_META} mt-1 block leading-relaxed`}>
                      {task.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <ProbationDecisionModal
        isOpen={Boolean(probationModal)}
        employeeId={probationModal?.employeeId}
        employeeName={probationModal?.employeeName}
        probationEndDate={probationModal?.probationEndDate}
        onClose={() => setProbationModal(null)}
        onSuccess={setSuccessMessage}
      />

      <SmartToolsModals {...modalProps} />
    </div>
  );
}
