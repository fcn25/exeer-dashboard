import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  FileText,
  Fingerprint,
  MessageSquare,
  Sparkles,
  Star,
  Target,
  UserPlus,
} from "lucide-react";
import {
  canAccessStrategicAI,
  canManageAttendanceSettings,
  canViewPayroll,
} from "../utils/rbac.js";
import { SMART_TOOLS } from "../constants/smartTools.js";
import { useSmartToolsModals } from "../hooks/useSmartToolsModals.js";
import SmartToolsModals from "../components/smart-tools/SmartToolsModals.jsx";
import { getUserDisplay } from "../utils/mobileAuth.js";
import { fetchHomeDashboardData } from "../services/homeDashboardService.js";
import PlgOnboardingBanner from "../components/onboarding/PlgOnboardingBanner.jsx";
import ProbationDecisionModal from "../components/home/ProbationDecisionModal.jsx";

const PRIORITY_STYLES = {
  red: {
    iconBg: "bg-red-50 text-red-700",
    border: "border-red-100",
  },
  orange: {
    iconBg: "bg-amber-50 text-amber-700",
    border: "border-amber-100",
  },
  blue: {
    iconBg: "bg-blue-50 text-blue-700",
    border: "border-blue-100",
  },
};

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
    id: "request",
    label: "إنشاء طلب",
    icon: ClipboardList,
    href: "/dashboard/my-team",
  },
  {
    id: "evaluation",
    label: "بدء تقييم",
    icon: Target,
    href: "/dashboard/performance",
  },
  {
    id: "add-employee",
    label: "إضافة موظف",
    icon: UserPlus,
    href: "/dashboard/employees?add=1",
  },
];

function formatDualDate() {
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

  return { gregorian, hijri };
}

function PulsePill({ label, tone }) {
  const tones = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    orange: "border-amber-200 bg-amber-50 text-amber-800",
    gray: "border-slate-200 bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium ${tones[tone]}`}
    >
      {label}
    </span>
  );
}

function SmartStatCard({ value, label, sublabel, isLoading }) {
  return (
    <article
      className="rounded-md border border-exeer-border/80 p-5"
      style={{ background: "var(--color-background-secondary)" }}
    >
      <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
        {isLoading ? "—" : value}
      </p>
      <p className="mt-1 text-[13px] font-medium text-slate-700">{label}</p>
      {sublabel ? (
        <p className="mt-1 text-xs text-slate-500">{sublabel}</p>
      ) : null}
    </article>
  );
}

function ActionItemRow({ item, onAction }) {
  const Icon = ACTION_ICONS[item.type] ?? AlertTriangle;
  const style = PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.blue;

  return (
    <div
      className={`flex flex-col gap-3 rounded-md border bg-white p-4 sm:flex-row sm:items-center sm:justify-between ${style.border}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.iconBg}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onAction(item)}
        className="md-btn-tonal shrink-0 self-start sm:self-center"
      >
        {item.actionLabel}
      </button>
    </div>
  );
}

function SmartToolCardSmall({ label, icon: Icon, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-md border border-exeer-border bg-white px-3 py-4 text-center transition-colors hover:bg-exeer-hover disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-exeer-border bg-[var(--color-background-secondary)] text-slate-900">
        <Icon className="h-4 w-4 stroke-[1.75]" aria-hidden />
      </span>
      <span className="text-xs font-medium text-slate-900">{label}</span>
    </button>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const user = getUserDisplay();
  const dates = formatDualDate();
  const { resolveToolAction, modalProps } = useSmartToolsModals();
  const showPayroll = canViewPayroll();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [probationModal, setProbationModal] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const data = await fetchHomeDashboardData({ includePayroll: showPayroll });
        if (!cancelled) setDashboard(data);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "تعذّر تحميل لوحة التحكم.");
        }
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

  return (
    <div className="md-page space-y-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2 text-start">
          <h1 className="md-page-title">مرحباً بك، {user.name}</h1>
          <p className="text-sm text-exeer-muted">نظرة عامة على نشاطك اليوم</p>
          <div className="space-y-0.5 text-xs text-slate-500">
            <p>{dates.gregorian}</p>
            {dates.hijri ? <p>{dates.hijri} هـ</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <PulsePill
            label={`${isLoading ? "—" : pulse?.working ?? 0} يعمل اليوم`}
            tone="green"
          />
          <PulsePill
            label={`${isLoading ? "—" : pulse?.onLeave ?? 0} في إجازة`}
            tone="orange"
          />
          <PulsePill
            label={`${isLoading ? "—" : pulse?.late ?? 0} متأخر`}
            tone="gray"
          />
        </div>
      </header>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      <PlgOnboardingBanner employeeCount={stats?.employeeCount ?? 0} />

      {canManageAttendanceSettings() ? (
        <Link
          to="/dashboard/attendance/settings"
          className="flex items-center gap-4 rounded-md border border-exeer-border bg-white p-5 transition-colors hover:bg-exeer-hover"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-exeer-border bg-[var(--color-background-secondary)] text-slate-900">
            <Fingerprint className="h-5 w-5 stroke-[1.75]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">
              إعدادات البصمة والمواقع
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              تعريف فروع العمل، نطاقات الحضور، وربط الموظفين
            </span>
          </span>
        </Link>
      ) : null}

      <section className="md-surface space-y-4 p-5">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-900">
            يحتاج اهتمامك
          </h2>
          {!isLoading && actionItems.length > 0 ? (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
              {actionItems.length}
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-slate-500">جاري التحميل...</p>
        ) : actionItems.length === 0 ? (
          <div className="rounded-md border border-emerald-100 bg-emerald-50 px-4 py-8 text-center">
            <p className="text-sm font-medium text-emerald-800">
              كل شيء على ما يرام، لا توجد إجراءات معلقة
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {actionItems.map((item) => (
              <ActionItemRow
                key={item.id}
                item={item}
                onAction={handleActionItem}
              />
            ))}
          </div>
        )}
      </section>

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="إحصائيات ذكية"
      >
        <SmartStatCard
          isLoading={isLoading}
          value={stats ? `${stats.attendanceRate}%` : "—"}
          label="نسبة الحضور هذا الشهر"
        />
        <SmartStatCard
          isLoading={isLoading}
          value={stats?.employeeCount ?? "—"}
          label="إجمالي الموظفين"
          sublabel={
            stats
              ? `${stats.saudiCount} سعودي / ${stats.nonSaudiCount} غير سعودي`
              : null
          }
        />
        <SmartStatCard
          isLoading={isLoading}
          value={stats?.tenureLabel ?? "—"}
          label="متوسط الأقدمية"
        />
        {showPayroll ? (
          <SmartStatCard
            isLoading={isLoading}
            value={
              stats?.monthlyPayrollTotal != null
                ? new Intl.NumberFormat("ar-SA", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(stats.monthlyPayrollTotal)
                : "—"
            }
            label={`إجمالي رواتب ${stats?.payrollMonthLabel ?? "الشهر"}`}
          />
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-slate-900">أدوات سريعة</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.id}
              to={action.href}
              className="flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-md border border-exeer-border bg-white px-3 py-4 text-center transition-colors hover:bg-exeer-hover"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-exeer-border bg-[var(--color-background-secondary)] text-slate-900">
                <action.icon className="h-4 w-4 stroke-[1.75]" aria-hidden />
              </span>
              <span className="text-xs font-medium text-slate-900">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {canAccessStrategicAI() ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-slate-500" aria-hidden />
            <h2 className="text-sm font-semibold text-slate-700">المهام الذكية</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {SMART_TOOLS.map((task) => {
              const onClick = resolveToolAction(task.id);
              return (
                <SmartToolCardSmall
                  key={task.id}
                  label={task.label}
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
