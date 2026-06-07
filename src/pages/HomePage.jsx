import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  Check,
  ClipboardList,
  Download,
  FileText,
  GraduationCap,
  MessageSquare,
  Sparkles,
  Star,
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
  HOME_CARD,
  HOME_SHELL,
  HOME_SURFACE,
  PRIORITY_ICON_STYLES,
} from "../components/home/homeStyles.js";
import { useAppLocale } from "../i18n/useAppLocale.js";
import {
  formatLocaleHeaderDate,
  formatLocaleNumber,
} from "../i18n/formatLocale.js";

const ACTION_ICONS = {
  iqama: AlertTriangle,
  probation: CalendarClock,
  requests: ClipboardList,
  evaluation: Target,
};

const HEADER_ACTIONS = [
  {
    id: "add-employee",
    labelKey: "pages.home.addEmployee",
    primary: true,
    href: "/dashboard/employees?add=1",
  },
  {
    id: "create-request",
    labelKey: "pages.home.createRequest",
    primary: false,
    href: "/dashboard/my-team",
  },
  {
    id: "export",
    labelKey: "pages.home.export",
    primary: false,
    href: "/dashboard/payroll",
  },
];

const QUICK_ACTIONS = [
  { id: "one-on-one", labelKey: "pages.home.oneOnOne", icon: MessageSquare, href: "/dashboard/my-team" },
  { id: "appreciation", labelKey: "pages.home.appreciation", icon: Star, href: "/dashboard/employees" },
  { id: "note", labelKey: "pages.home.addNote", icon: FileText, href: "/dashboard/administrative-actions" },
  { id: "training", labelKey: "pages.home.trainingRequest", icon: GraduationCap, href: "/dashboard/my-team#hr-requests" },
  { id: "promotion", labelKey: "pages.home.promotionRequest", icon: TrendingUp, href: "/dashboard/my-team#hr-requests" },
  { id: "administrative", labelKey: "pages.home.adminAction", icon: Briefcase, href: "/dashboard/administrative-actions" },
];

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
      <p className="text-[13px] font-normal text-[#64748B]">{label}</p>
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
        <span className="text-[34px] font-semibold text-[#0F172A]">0</span>
        <span className="text-[20px] font-normal text-[#94A3B8]">.00</span>
        <span className="ms-1 text-[16px] font-normal text-[#64748B]">{suffix}</span>
      </p>
    );
  }

  const { integer, decimal } = splitMoneyParts(value);
  return (
    <p className="tabular-nums">
      <span className="text-[34px] font-semibold text-[#0F172A]">{integer}</span>
      <span className="text-[20px] font-normal text-[#94A3B8]">{decimal}</span>
      <span className="ms-1 text-[16px] font-normal text-[#64748B]">{suffix}</span>
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
          <p className="text-[14px] font-medium text-[#0F172A]">{item.title}</p>
          <p className="mt-0.5 text-[13px] font-normal text-[#64748B]">{item.detail}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onAction(item)}
        className={`${HOME_BTN} shrink-0 rounded-full bg-[#0F172A] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90`}
      >
        {item.actionLabel}
      </button>
    </div>
  );
}

function MiniStatCard({ label, value, sublabel, sparkline }) {
  return (
    <article className={`${HOME_SURFACE} p-4`}>
      <p className="text-[12px] font-normal text-[#64748B]">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums text-[#0F172A]">{value}</p>
      {sublabel ? (
        <p className="mt-0.5 text-[11px] font-normal text-[#94A3B8]">{sublabel}</p>
      ) : null}
      <SparkLine data={sparkline} height={40} className="mt-2" />
    </article>
  );
}

export default function HomePage() {
  const { t } = useAppLocale();
  const navigate = useNavigate();
  const user = getUserDisplay();
  const headerDate = formatLocaleHeaderDate();
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

  const headerActions = useMemo(
    () =>
      HEADER_ACTIONS.map((action) => ({
        ...action,
        label: t(action.labelKey),
        ...(action.id === "export" && !showPayroll
          ? { href: "/dashboard/employees" }
          : {}),
      })),
    [t, showPayroll],
  );

  const quickActions = useMemo(
    () =>
      QUICK_ACTIONS.map((action) => ({
        ...action,
        label: t(action.labelKey),
      })),
    [t],
  );

  return (
    <div className="-mx-6 -my-8 flex flex-col gap-5 bg-[#FFFFFF] px-6 py-8 md:-mx-8 md:px-8">
      {/* ─── 1. ترويسة ─── */}
      <header className={`${HOME_SHELL} p-6`}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap justify-end gap-2">
            {headerActions.map((action) =>
              action.primary ? (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => navigate(action.href)}
                  className={`${HOME_BTN} rounded-full bg-[#0F172A] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90`}
                >
                  {action.label}
                </button>
              ) : (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => navigate(action.href)}
                  className={`${HOME_BTN} inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-[13px] font-medium text-[#0F172A] hover:bg-[#F8FAFC]`}
                >
                  {action.id === "export" ? (
                    <Download className="h-4 w-4" aria-hidden />
                  ) : null}
                  {action.label}
                </button>
              ),
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-start">
              <p className="text-[13px] font-normal text-[#64748B]">{getGreeting(t)}</p>
              <h1 className="text-[24px] font-medium text-[#0F172A]">{user.name}</h1>
              <p className="text-[12px] font-normal text-[#94A3B8]">{headerDate}</p>
            </div>

            <div className="flex flex-wrap gap-2 sm:shrink-0">
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
        </div>
      </header>

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
        <article className={`${HOME_SHELL} p-6`}>
          <p className="text-[14px] font-normal text-[#64748B]">
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
            <p className="mt-1 text-[12px] font-normal text-[#94A3B8]">
              {t("pages.home.noPayrollYet")}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DeltaBadge value={payrollHero?.percentChange ?? null} />
            {payrollHero?.percentChange != null ? (
              <span className="text-[12px] font-normal text-[#94A3B8]">
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

        <article className={`${HOME_SHELL} p-6`}>
          <h2 className="text-[16px] font-medium text-[#0F172A]">
            {t("pages.home.workforceTitle")}
          </h2>
          <p className="mt-1 text-[12px] font-normal text-[#94A3B8]">
            {isLoading
              ? t("common.loading")
              : stats?.hasEmployeeData
                ? t("pages.home.activeEmployees", {
                    count: formatLocaleNumber(employeeTotal),
                  })
                : t("pages.home.noEmployeesYet")}
          </p>

          <ul className="mt-5 space-y-4">
            <li className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#0F172A]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ECFDF5] text-[#047857]">
                  <Users className="h-4 w-4" aria-hidden />
                </span>
                {t("pages.home.saudi")}
              </div>
              <div className="text-end">
                <p className="text-[14px] font-semibold tabular-nums text-[#0F172A]">
                  {formatLocaleNumber(saudiPercent)}%
                </p>
                <p className="text-[12px] font-normal text-[#64748B]">
                  {t("pages.home.employeeCount", {
                    count: formatLocaleNumber(saudiCount),
                  })}
                </p>
              </div>
            </li>
            <li className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#0F172A]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9] text-[#475569]">
                  <Users className="h-4 w-4" aria-hidden />
                </span>
                {t("pages.home.nonSaudi")}
              </div>
              <div className="text-end">
                <p className="text-[14px] font-semibold tabular-nums text-[#0F172A]">
                  {formatLocaleNumber(nonSaudiPercent)}%
                </p>
                <p className="text-[12px] font-normal text-[#64748B]">
                  {t("pages.home.employeeCount", {
                    count: formatLocaleNumber(nonSaudiCount),
                  })}
                </p>
              </div>
            </li>
          </ul>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#F1F5F9]">
            <div className="flex h-full w-full">
              <div
                className="h-full bg-[#0F172A]"
                style={{ width: `${saudiPercent}%` }}
              />
              <div
                className="h-full bg-[#94A3B8]"
                style={{ width: `${nonSaudiPercent}%` }}
              />
            </div>
          </div>
        </article>
      </section>

      {/* ─── 3. يحتاج اهتمامك ─── */}
      <section className={`${HOME_SHELL} border-r-[3px] border-r-[#0F172A] p-6`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-medium text-[#0F172A]">
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
          <p className="py-6 text-center text-[13px] font-normal text-[#94A3B8]">
            {t("common.loading")}
          </p>
        ) : actionItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Check className="h-10 w-10 text-[#10B981]" aria-hidden />
            <p className="text-[14px] font-normal text-[#64748B]">
              {t("pages.home.allClear")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requestActionError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {requestActionError}
              </p>
            ) : null}
            {actionItems.map((item, index) => (
              <div
                key={item.id}
                className={
                  index < actionItems.length - 1
                    ? "border-b border-[#F1F5F9] pb-3"
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

      {/* ─── 5. أدوات سريعة ─── */}
      <section className="space-y-4">
        <h2 className="text-[16px] font-medium text-[#0F172A]">
          {t("pages.home.quickTools")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {quickActions.map((action) => (
            <Link
              key={action.id}
              to={action.href}
              className={`${HOME_BTN} flex items-center gap-2 border border-[#E2E8F0] bg-white px-4 py-3 text-[13px] font-medium text-[#0F172A] hover:bg-[#F8FAFC] [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-[#0F172A]`}
            >
              <action.icon className="shrink-0" aria-hidden />
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── 6. المهام الذكية ─── */}
      {canAccessStrategicAI() ? (
        <section className="mt-10 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#4F46E5]" aria-hidden />
            <h2 className="text-[16px] font-medium text-[#0F172A]">
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
                  className={`${HOME_CARD} relative flex min-h-[128px] flex-col items-start gap-3 p-5 text-start hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <span className="inline-flex items-center rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-medium text-[#4F46E5]">
                    ✨ AI
                  </span>
                  <task.icon className="h-5 w-5 text-[#0F172A]" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium text-[#0F172A]">
                      {task.label}
                    </span>
                    <span className="mt-1 block text-[12px] font-normal leading-relaxed text-[#64748B]">
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
