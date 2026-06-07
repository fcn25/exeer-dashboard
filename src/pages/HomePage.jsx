import { useEffect, useState } from "react";
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
import ProbationDecisionModal from "../components/home/ProbationDecisionModal.jsx";
import SparkLine from "../components/home/SparkLine.jsx";
import PayrollBarChart from "../components/home/PayrollBarChart.jsx";
import {
  HOME_BTN,
  HOME_CARD,
  HOME_SHELL,
  HOME_SURFACE,
  PRIORITY_ICON_STYLES,
} from "../components/home/homeStyles.js";

const ACTION_ICONS = {
  iqama: AlertTriangle,
  probation: CalendarClock,
  requests: ClipboardList,
  evaluation: Target,
};

const HEADER_ACTIONS = [
  {
    id: "add-employee",
    label: "إضافة موظف",
    primary: true,
    href: "/dashboard/employees?add=1",
  },
  {
    id: "create-request",
    label: "إنشاء طلب",
    primary: false,
    href: "/dashboard/my-team",
  },
  {
    id: "export",
    label: "تصدير",
    primary: false,
    href: "/dashboard/payroll",
  },
];

const QUICK_ACTIONS = [
  { id: "one-on-one", label: "تسجيل اجتماع 1:1", icon: MessageSquare, href: "/dashboard/my-team" },
  { id: "appreciation", label: "تقدير موظف", icon: Star, href: "/dashboard/employees" },
  { id: "note", label: "إضافة ملاحظة", icon: FileText, href: "/dashboard/administrative-actions" },
  { id: "training", label: "طلب تدريب", icon: GraduationCap, href: "/dashboard/my-team?tab=hr-requests" },
  { id: "promotion", label: "طلب ترقية", icon: TrendingUp, href: "/dashboard/my-team?tab=hr-requests" },
  { id: "administrative", label: "إجراء إداري", icon: Briefcase, href: "/dashboard/administrative-actions" },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "صباح الخير";
  if (hour < 17) return "مساء الخير";
  return "مساءً طيباً";
}

function formatHeaderDate() {
  const now = new Date();
  const gregorian = new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  let hijri = "";
  try {
    hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);
  } catch {
    hijri = "";
  }

  return hijri ? `${gregorian} · ${hijri}` : gregorian;
}

function formatArabicNumber(value, options = {}) {
  return new Intl.NumberFormat("ar-SA", options).format(Number(value) || 0);
}

function splitMoneyParts(value) {
  const amount = Number(value) || 0;
  const fixed = amount.toFixed(2);
  const [integerPart, decimalPart] = fixed.split(".");
  return {
    integer: formatArabicNumber(integerPart),
    decimal: `.${decimalPart}`,
  };
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

function SplitMoneyValue({ value, suffix = " ر.س", isLoading = false }) {
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

function ActionItemRow({ item, onAction }) {
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
  const navigate = useNavigate();
  const user = getUserDisplay();
  const headerDate = formatHeaderDate();
  const { resolveToolAction, modalProps } = useSmartToolsModals();
  const showPayroll = canViewPayroll();

  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [probationModal, setProbationModal] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchHomeDashboardData({ includePayroll: showPayroll });
        if (!cancelled) setDashboard(data);
      } catch {
        if (!cancelled) setDashboard(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [showPayroll]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

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
  const chartData = payrollHero?.sparkline ?? [];

  const headerActions = HEADER_ACTIONS.map((action) =>
    action.id === "export" && !showPayroll
      ? { ...action, href: "/dashboard/employees" }
      : action,
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
              <p className="text-[13px] font-normal text-[#64748B]">{getGreeting()}</p>
              <h1 className="text-[24px] font-medium text-[#0F172A]">{user.name}</h1>
              <p className="text-[12px] font-normal text-[#94A3B8]">{headerDate}</p>
            </div>

            <div className="flex flex-wrap gap-2 sm:shrink-0">
              <PulsePill
                label={`${formatArabicNumber(workingCount)} يعمل اليوم`}
                bg="#ECFDF5"
                color="#047857"
              />
              <PulsePill
                label={`${formatArabicNumber(leaveCount)} في إجازة`}
                bg="#FEF3C7"
                color="#92400E"
              />
              <PulsePill
                label={`${formatArabicNumber(lateCount)} متأخر`}
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

      {/* ─── 2. صف هيرو 60/40 ─── */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_2fr]">
        <article className={`${HOME_SHELL} p-6`}>
          <p className="text-[14px] font-normal text-[#64748B]">
            إجمالي رواتب {payrollMonthLabel}
          </p>

          <div className="mt-2">
            <SplitMoneyValue value={payrollTotal} isLoading={isLoading} />
          </div>

          {!isLoading && !payrollHero?.hasData ? (
            <p className="mt-1 text-[12px] font-normal text-[#94A3B8]">
              لم يُنشأ مسير رواتب بعد
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DeltaBadge value={payrollHero?.percentChange ?? null} />
            {payrollHero?.percentChange != null ? (
              <span className="text-[12px] font-normal text-[#94A3B8]">
                مقارنة بالشهر الماضي
              </span>
            ) : null}
          </div>

          <PayrollBarChart data={chartData} height={128} className="mt-5" />
        </article>

        <article className={`${HOME_SHELL} p-6`}>
          <h2 className="text-[16px] font-medium text-[#0F172A]">توزيع القوى العاملة</h2>
          <p className="mt-1 text-[12px] font-normal text-[#94A3B8]">
            {isLoading
              ? "جاري التحميل..."
              : stats?.hasEmployeeData
                ? `${formatArabicNumber(employeeTotal)} موظف نشط`
                : "لا يوجد موظفون بعد"}
          </p>

          <ul className="mt-5 space-y-4">
            <li className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#0F172A]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ECFDF5] text-[#047857]">
                  <Users className="h-4 w-4" aria-hidden />
                </span>
                سعوديون
              </div>
              <div className="text-end">
                <p className="text-[14px] font-semibold tabular-nums text-[#0F172A]">
                  {formatArabicNumber(saudiPercent)}%
                </p>
                <p className="text-[12px] font-normal text-[#64748B]">
                  {formatArabicNumber(saudiCount)} موظف
                </p>
              </div>
            </li>
            <li className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#0F172A]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9] text-[#475569]">
                  <Users className="h-4 w-4" aria-hidden />
                </span>
                غير سعوديين
              </div>
              <div className="text-end">
                <p className="text-[14px] font-semibold tabular-nums text-[#0F172A]">
                  {formatArabicNumber(nonSaudiPercent)}%
                </p>
                <p className="text-[12px] font-normal text-[#64748B]">
                  {formatArabicNumber(nonSaudiCount)} موظف
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
          <h2 className="text-[18px] font-medium text-[#0F172A]">يحتاج اهتمامك</h2>
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
            جاري التحميل...
          </p>
        ) : actionItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Check className="h-10 w-10 text-[#10B981]" aria-hidden />
            <p className="text-[14px] font-normal text-[#64748B]">
              كل شيء مرتّب، لا توجد إجراءات معلّقة
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {actionItems.map((item, index) => (
              <div
                key={item.id}
                className={
                  index < actionItems.length - 1
                    ? "border-b border-[#F1F5F9] pb-3"
                    : ""
                }
              >
                <ActionItemRow item={item} onAction={handleActionItem} />
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
          label="نسبة الحضور"
          value={
            isLoading || !stats
              ? "0%"
              : stats.hasAttendanceData
                ? `${stats.attendanceRate}%`
                : "0%"
          }
          sublabel={stats?.hasAttendanceData ? null : "لا توجد بيانات حضور"}
          sparkline={stats?.attendanceSparkline}
        />
        <MiniStatCard
          label="إجمالي الموظفين"
          value={isLoading || !stats ? "0" : formatArabicNumber(stats.employeeCount)}
          sublabel={
            stats?.hasEmployeeData
              ? `${formatArabicNumber(stats.saudiCount)} سعودي · ${formatArabicNumber(stats.nonSaudiCount)} غير سعودي`
              : "لا يوجد موظفون بعد"
          }
        />
        <MiniStatCard
          label="متوسط الأقدمية"
          value={
            isLoading || !stats
              ? "—"
              : stats.hasTenureData
                ? stats.tenureLabel
                : "—"
          }
          sublabel={stats?.hasTenureData ? null : "لا توجد تواريخ تعيين"}
        />
        <MiniStatCard
          label="طلبات الشهر"
          value={
            isLoading || !stats ? "0" : formatArabicNumber(stats.monthlyRequestsCount)
          }
          sublabel={
            stats?.hasMonthlyRequestsData ? null : "لم يُسجّل طلب هذا الشهر"
          }
          sparkline={stats?.monthlyRequestsSparkline}
        />
      </section>

      {/* ─── 5. أدوات سريعة ─── */}
      <section className="space-y-4">
        <h2 className="text-[16px] font-medium text-[#0F172A]">أدوات سريعة</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {QUICK_ACTIONS.map((action) => (
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
            <h2 className="text-[16px] font-medium text-[#0F172A]">المهام الذكية</h2>
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
