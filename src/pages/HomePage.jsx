import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Fingerprint,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { canManageAttendanceSettings } from "../utils/rbac.js";
import {
  fetchDashboardStats,
  fetchPendingRequestsPreview,
} from "../services/dashboardService.js";
import { getUserDisplay } from "../utils/mobileAuth.js";
const SmartInterviewModal = lazy(
  () => import("../components/SmartInterviewModal.jsx"),
);
const SmartGoalsModal = lazy(() => import("../components/SmartGoalsModal.jsx"));
const SmartTasksModal = lazy(() => import("../components/SmartTasksModal.jsx"));
const AchievementsArchiveModal = lazy(
  () => import("../components/achievements/AchievementsArchiveModal.jsx"),
);
const MonthlyReportModal = lazy(
  () => import("../components/MonthlyReportModal.jsx"),
);
import PlgOnboardingBanner from "../components/onboarding/PlgOnboardingBanner.jsx";
import ExeerEmptyState from "../components/brand/ExeerEmptyState.jsx";

const SMART_INTERVIEW_ID = "smart-interview";
const SMART_TASK_ID = "smart-task";
const SMART_GOALS_ID = "smart-goals";
const ACHIEVEMENTS_RECORD_ID = "achievements-record";
const MONTHLY_REPORT_ID = "monthly-report";

const SMART_TASKS = [
  { id: "smart-task", label: "المهام الذكية", icon: Sparkles },
  { id: SMART_INTERVIEW_ID, label: "المقابلة الذكية", icon: MessageSquare },
  { id: "management-advisor", label: "المستشار الإداري", icon: Lightbulb },
  { id: SMART_GOALS_ID, label: "الأهداف الذكية", icon: Target },
  { id: ACHIEVEMENTS_RECORD_ID, label: "سجل الإنجازات", icon: Trophy },
  { id: "monthly-report", label: "التقرير الشهري", icon: FileText },
];

function StatCard({ value, label, isLoading }) {
  return (
    <article className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-5">
      <p className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {isLoading ? "—" : value}
      </p>
      <p className="text-sm text-slate-500">{label}</p>
    </article>
  );
}

function SmartTaskCard({ label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[120px] flex-col items-center justify-center gap-2.5 rounded-md border border-gray-200 bg-white px-4 py-5 text-center transition-colors hover:bg-gray-50"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-slate-900">
        <Icon className="h-5 w-5 stroke-[1.75]" aria-hidden />
      </span>
      <span className="text-sm font-medium text-slate-900">{label}</span>
    </button>
  );
}

export default function HomePage() {
  const user = getUserDisplay();
  const [isSmartInterviewOpen, setIsSmartInterviewOpen] = useState(false);
  const [isSmartTasksOpen, setIsSmartTasksOpen] = useState(false);
  const [isSmartGoalsOpen, setIsSmartGoalsOpen] = useState(false);
  const [isAchievementsArchiveOpen, setIsAchievementsArchiveOpen] =
    useState(false);
  const [isMonthlyReportOpen, setIsMonthlyReportOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    employeeCount: 0,
    pendingTasks: 0,
    upcomingEvents: 0,
    pendingRequests: 0,
  });
  const [pendingPreview, setPendingPreview] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const [nextStats, preview] = await Promise.all([
          fetchDashboardStats(),
          fetchPendingRequestsPreview(5),
        ]);

        if (cancelled) return;
        setStats(nextStats);
        setPendingPreview(preview);
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
  }, []);

  const statCards = [
    { value: stats.employeeCount, label: "إجمالي الموظفين" },
    { value: stats.pendingTasks, label: "المهام المعلقة" },
    { value: stats.upcomingEvents, label: "الفعاليات القادمة" },
    { value: stats.pendingRequests, label: "الطلبات المعلقة" },
  ];

  return (
    <div className="md-page">
      <header className="space-y-1">
        <h1 className="md-page-title">مرحباً بك، {user.name}</h1>
        <p className="text-sm text-slate-500">
          نظرة عامة على نشاط المنشأة اليوم
        </p>
      </header>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <PlgOnboardingBanner employeeCount={stats.employeeCount} />

      {canManageAttendanceSettings() ? (
        <Link
          to="/dashboard/attendance/settings"
          className="flex items-center gap-4 rounded-md border border-gray-200 bg-white p-5 transition-colors hover:bg-gray-50"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-slate-900">
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

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="إحصائيات سريعة"
      >
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} isLoading={isLoading} />
        ))}
      </section>

      <section className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">المهام الذكية</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {SMART_TASKS.map((task) => (
              <SmartTaskCard
                key={task.id}
                label={task.label}
                icon={task.icon}
                onClick={
                  task.id === SMART_INTERVIEW_ID
                    ? () => setIsSmartInterviewOpen(true)
                    : task.id === SMART_TASK_ID
                      ? () => setIsSmartTasksOpen(true)
                      : task.id === SMART_GOALS_ID
                        ? () => setIsSmartGoalsOpen(true)
                        : task.id === ACHIEVEMENTS_RECORD_ID
                          ? () => setIsAchievementsArchiveOpen(true)
                          : task.id === MONTHLY_REPORT_ID
                            ? () => setIsMonthlyReportOpen(true)
                            : undefined
                }
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">الطلبات المعلقة</h2>
          <div className="min-h-[280px] rounded-md border border-gray-200 bg-white p-4 lg:min-h-[320px]">
            {isLoading ? (
              <p className="py-16 text-center text-sm text-slate-500">
                جاري التحميل...
              </p>
            ) : pendingPreview.length === 0 ? (
              <ExeerEmptyState
                message="لا توجد طلبات معلقة حالياً"
                className="py-12"
                symbolClassName="mb-3 h-12 w-12 object-contain opacity-[0.18]"
              />
            ) : (
              <ul className="divide-y divide-gray-200">
                {pendingPreview.map((request) => (
                  <li key={request.id} className="py-3 first:pt-0">
                    <p className="text-sm font-medium text-slate-900">
                      {request.employee_name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {request.request_type}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <SmartInterviewModal
          isOpen={isSmartInterviewOpen}
          onClose={() => setIsSmartInterviewOpen(false)}
        />

        <SmartTasksModal
          isOpen={isSmartTasksOpen}
          onClose={() => setIsSmartTasksOpen(false)}
        />

        <SmartGoalsModal
          isOpen={isSmartGoalsOpen}
          onClose={() => setIsSmartGoalsOpen(false)}
        />

        <AchievementsArchiveModal
          isOpen={isAchievementsArchiveOpen}
          onClose={() => setIsAchievementsArchiveOpen(false)}
        />

        <MonthlyReportModal
          isOpen={isMonthlyReportOpen}
          onClose={() => setIsMonthlyReportOpen(false)}
        />
      </Suspense>
    </div>
  );
}
