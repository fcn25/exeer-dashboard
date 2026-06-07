import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CalendarClock,
  Check,
  ClipboardList,
  FileText,
  GraduationCap,
  MessageSquare,
  MoreHorizontal,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from "lucide-react";
import { canAccessStrategicAI, canViewPayroll } from "../utils/rbac.js";
import { SMART_TOOLS } from "../constants/smartTools.js";
import { useSmartToolsModals } from "../hooks/useSmartToolsModals.js";
import SmartToolsModals from "../components/smart-tools/SmartToolsModals.jsx";
import { getUserDisplay } from "../utils/mobileAuth.js";
import { fetchHomeDashboardData } from "../services/homeDashboardService.js";
import ProbationDecisionModal from "../components/home/ProbationDecisionModal.jsx";
import SparkLine from "../components/home/SparkLine.jsx";
import {
  HOME_CARD,
  HOME_SURFACE,
  PRIORITY_ICON_STYLES,
} from "../components/home/homeStyles.js";

const CARD = HOME_CARD;
const SURFACE = HOME_SURFACE;

const ACTION_ICONS = {
  iqama: AlertTriangle,
  probation: CalendarClock,
  requests: ClipboardList,
  evaluation: Target,
};

const QUICK_ACTIONS = [
  {
    id: "one-on-one",
    label: "تسجيل اجتماع 1:1",
    icon: MessageSquare,
    href: "/dashboard/my-team",
  },
  {
    id: "appreciation",
    label: "تقدير موظف",
    icon: Star,
    href: "/dashboard/employees",
  },
  {
    id: "note",
    label: "إضافة ملاحظة",
    icon: FileText,
    href: "/dashboard/administrative-actions",
  },
  {
    id: "training",
    label: "طلب تدريب",
    icon: GraduationCap,
    href: "/dashboard/my-team?tab=hr-requests",
  },
  {
    id: "promotion",
    label: "طلب ترقية",
    icon: TrendingUp,
    href: "/dashboard/my-team?tab=hr-requests",
  },
  {
    id: "administrative",
    label: "إجراء إداري",
    icon: Briefcase,
    href: "/dashboard/administrative-actions",
  },
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

function initialsFromName(name) {
  const trimmed = String(name ?? "").trim();
  return trimmed ? trimmed.charAt(0) : "؟";
}

function formatArabicNumber(value) {
  return new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
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

function Avatar({ name, size = 40 }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] font-medium text-[#0F172A]"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initialsFromName(name)}
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
          <p className="mt-0.5 text-[13px] text-[#64748B]">{item.detail}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onAction(item)}
        className="shrink-0 rounded-full bg-[#0F172A] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:opacity-90"
      >
        {item.actionLabel}
      </button>
    </div>
  );
}

function CompactStatCard({ label, value, sublabel, sparkline }) {
  return (
    <article className={`${SURFACE} p-4`}>
      <p className="text-[12px] text-[#64748B]">{label}</p>
      <p className="mt-1 text-[22px] font-medium tabular-nums text-[#0F172A]">
        {value}
      </p>
      {sublabel ? (
        <p className="mt-0.5 text-[12px] text-[#94A3B8]">{sublabel}</p>
      ) : null}
      <SparkLine data={sparkline} height={40} className="mt-2" />
    </article>
  );
}

function SmartTaskCard({ label, description, icon: Icon, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${CARD} relative flex min-h-[128px] flex-col items-start gap-3 p-5 text-start transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <span className="inline-flex items-center rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-medium text-[#4F46E5]">
        ✨ AI
      </span>
      <Icon className="h-5 w-5 text-[#0F172A]" aria-hidden />
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-[#0F172A]">{label}</span>
        <span className="mt-1 block text-[12px] leading-relaxed text-[#64748B]">
          {description}
        </span>
      </span>
    </button>
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
  const todayAgenda = dashboard?.todayAgenda ?? [];
  const pendingRequests = dashboard?.pendingRequests ?? { total: 0, items: [] };
  const topPerformers = dashboard?.topPerformers ?? [];

  const workingCount = isLoading ? 0 : (pulse?.working ?? 0);
  const leaveCount = isLoading ? 0 : (pulse?.onLeave ?? 0);
  const lateCount = isLoading ? 0 : (pulse?.late ?? 0);

  const payrollDisplay = payrollHero?.hasData
    ? `${formatCurrency(payrollHero.total)} ر.س`
    : "0 ر.س";

  const payrollHint = payrollHero?.hasData
    ? null
    : "لم يُنشأ مسير رواتب بعد";

  return (
    <div className="-mx-6 -my-8 flex flex-col gap-5 bg-[#FFFFFF] px-6 py-8 md:-mx-8 md:px-8">
      <header className={`${CARD} flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="space-y-1 text-start">
          <p className="text-[13px] text-[#64748B]">{getGreeting()}</p>
          <h1 className="text-[24px] font-medium text-[#0F172A]">{user.name}</h1>
          <p className="text-[12px] text-[#94A3B8]">{headerDate}</p>
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
      </header>

      {successMessage ? (
        <p className="rounded-[8px] border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-[13px] text-[#047857]">
          {successMessage}
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_2fr]">
        {showPayroll ? (
          <article className={`${SURFACE} p-6`}>
            <p className="text-[14px] text-[#64748B]">
              إجمالي رواتب {payrollHero?.monthLabel ?? stats?.payrollMonthLabel ?? "الشهر"}
            </p>
            <p className="mt-2 text-[36px] font-medium tabular-nums text-[#0F172A]">
              {isLoading ? "0 ر.س" : payrollDisplay}
            </p>
            {payrollHint ? (
              <p className="mt-1 text-[12px] text-[#94A3B8]">{payrollHint}</p>
            ) : null}
            {!isLoading && payrollHero?.percentChange != null ? (
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[12px] font-medium text-[#047857]">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                {payrollHero.percentChange > 0 ? "+" : ""}
                {payrollHero.percentChange}% عن الشهر الماضي
              </span>
            ) : null}
            <SparkLine
              data={payrollHero?.sparkline ?? []}
              height={56}
              className="mt-4"
            />
          </article>
        ) : (
          <article className={`${SURFACE} p-6`}>
            <p className="text-[14px] text-[#64748B]">ملخص الفريق</p>
            <p className="mt-2 text-[36px] font-medium tabular-nums text-[#0F172A]">
              {isLoading ? "0" : (stats?.employeeCount ?? 0)}
            </p>
            <p className="mt-1 text-[12px] text-[#94A3B8]">
              {stats?.hasEmployeeData
                ? `${stats.saudiCount} سعودي · ${stats.nonSaudiCount} غير سعودي`
                : "لا يوجد موظفون بعد"}
            </p>
          </article>
        )}

        <article className={`${SURFACE} p-6`}>
          <h2 className="text-[16px] font-medium text-[#0F172A]">أجندة اليوم</h2>
          {isLoading ? (
            <p className="mt-6 text-center text-[13px] text-[#94A3B8]">جاري التحميل...</p>
          ) : todayAgenda.length === 0 ? (
            <div className="mt-8 flex flex-col items-center gap-2 text-center">
              <Calendar className="h-8 w-8 text-[#94A3B8]" aria-hidden />
              <p className="text-[13px] text-[#64748B]">لا توجد مواعيد اليوم</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-4">
              {todayAgenda.map((event) => (
                <li key={event.id} className="text-start">
                  <p className="text-[12px] text-[#64748B]">{event.time}</p>
                  <p className="mt-0.5 text-[14px] font-medium text-[#0F172A]">
                    {event.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#64748B]">{event.subtitle}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className={`${CARD} border-r-[3px] border-r-[#0F172A] p-6`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-medium text-[#0F172A]">يحتاج اهتمامك</h2>
          {!isLoading && actionItems.length > 0 ? (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-[12px] font-medium text-[#B91C1C]">
              {actionItems.length}
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-[13px] text-[#94A3B8]">جاري التحميل...</p>
        ) : actionItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Check className="h-10 w-10 text-[#10B981]" aria-hidden />
            <p className="text-[14px] text-[#64748B]">
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
                <ActionItemRow
                  item={item}
                  onAction={handleActionItem}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        aria-label="إحصائيات مصغّرة"
      >
        <CompactStatCard
          label="نسبة الحضور"
          value={
            isLoading || !stats
              ? "0%"
              : stats.hasAttendanceData
                ? `${stats.attendanceRate}%`
                : "0%"
          }
          sublabel={
            stats?.hasAttendanceData ? null : "لا توجد بيانات حضور"
          }
          sparkline={stats?.attendanceSparkline}
        />
        <CompactStatCard
          label="إجمالي الموظفين"
          value={isLoading || !stats ? "0" : String(stats.employeeCount)}
          sublabel={
            stats?.hasEmployeeData
              ? `${stats.saudiCount} سعودي · ${stats.nonSaudiCount} غير سعودي`
              : "لا يوجد موظفون بعد"
          }
        />
        <CompactStatCard
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
        <CompactStatCard
          label="طلبات الشهر"
          value={
            isLoading || !stats ? "0" : String(stats.monthlyRequestsCount)
          }
          sublabel={
            stats?.hasMonthlyRequestsData ? null : "لم يُسجّل طلب هذا الشهر"
          }
          sparkline={stats?.monthlyRequestsSparkline}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_2fr]">
        <article className={`${CARD} p-6`}>
          <h2 className="text-[16px] font-medium text-[#0F172A]">
            أبرز الأداءات هذا الشهر
          </h2>
          {isLoading ? (
            <p className="mt-6 text-[13px] text-[#94A3B8]">جاري التحميل...</p>
          ) : topPerformers.length === 0 ? (
            <p className="mt-6 text-[13px] text-[#64748B]">
              لا توجد بيانات أداء بعد
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {topPerformers.map((person) => (
                <li
                  key={person.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={person.name} />
                    <div className="min-w-0 text-start">
                      <p className="truncate text-[14px] font-medium text-[#0F172A]">
                        {person.name}
                      </p>
                      <p className="truncate text-[12px] text-[#64748B]">
                        {person.jobTitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-[13px] font-medium tabular-nums text-[#0F172A]">
                      {person.performanceLabel}
                    </span>
                    <SparkLine data={person.sparkline} height={32} className="w-16" />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => navigate("/dashboard/my-team")}
            className="mt-5 rounded-full border border-[#E2E8F0] px-4 py-2 text-[13px] font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
          >
            عرض الكل
          </button>
        </article>

        <article className={`${CARD} p-6`}>
          <h2 className="text-[16px] font-medium text-[#0F172A]">
            طلبات بانتظار موافقتك
          </h2>
          {isLoading ? (
            <p className="mt-6 text-[13px] text-[#94A3B8]">جاري التحميل...</p>
          ) : pendingRequests.items.length === 0 ? (
            <p className="mt-6 text-[13px] text-[#64748B]">لا توجد طلبات معلّقة</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {pendingRequests.items.map((request) => (
                <li
                  key={request.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={request.employeeName} />
                    <div className="min-w-0 text-start">
                      <p className="truncate text-[14px] font-medium text-[#0F172A]">
                        {request.employeeName}
                      </p>
                      <p className="truncate text-[12px] text-[#64748B]">
                        {request.requestType}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/my-team?tab=team-requests")}
                    className="shrink-0 rounded-[8px] p-1.5 text-[#64748B] transition-colors hover:bg-[#F8FAFC]"
                    aria-label="إجراءات الطلب"
                  >
                    <MoreHorizontal className="h-5 w-5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => navigate("/dashboard/my-team?tab=team-requests")}
            className="mt-5 text-[13px] font-medium text-[#3B82F6] transition-opacity hover:opacity-80"
          >
            عرض كل الطلبات ({pendingRequests.total})
          </button>
        </article>
      </section>

      <section className="space-y-4">
        <h2 className="text-[16px] font-medium text-[#0F172A]">أدوات سريعة</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.id}
              to={action.href}
              className="flex items-center gap-2 rounded-[8px] border border-[#E2E8F0] bg-white px-4 py-3 text-[13px] font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC] [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-[#0F172A]"
            >
              <action.icon className="h-5 w-5 shrink-0" aria-hidden />
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

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
                <SmartTaskCard
                  key={task.id}
                  label={task.label}
                  description={task.description}
                  icon={task.icon}
                  onClick={onClick}
                  disabled={!onClick}
                />
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
