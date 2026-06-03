import { useEffect, useState } from "react";
import {
  FileText,
  Lightbulb,
  MessageSquare,
  Package,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import {
  fetchDashboardStats,
  fetchPendingRequestsPreview,
} from "../services/dashboardService.js";
import { getUserDisplay } from "../utils/mobileAuth.js";
import SmartInterviewModal from "../components/SmartInterviewModal.jsx";
import SmartGoalsModal from "../components/SmartGoalsModal.jsx";
import SmartTasksModal from "../components/SmartTasksModal.jsx";
import AchievementsArchiveModal from "../components/achievements/AchievementsArchiveModal.jsx";
import MonthlyReportModal from "../components/MonthlyReportModal.jsx";
import PlgOnboardingBanner from "../components/onboarding/PlgOnboardingBanner.jsx";

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
    <article className="md-surface flex flex-col gap-3 p-6 md:p-7">
      <p className="text-4xl font-bold tracking-tight text-exeer-primary">
        {isLoading ? "—" : value}
      </p>
      <p className="text-sm font-medium text-exeer-muted">{label}</p>
    </article>
  );
}

function SmartTaskCard({ label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="md-surface-muted flex min-h-[132px] flex-col items-center justify-center gap-3 px-4 py-6 text-center transition-colors hover:bg-exeer-hover"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-exeer-primary md-elevated">
        <Icon className="h-6 w-6 stroke-[1.75]" aria-hidden />
      </span>
      <span className="text-sm font-medium text-exeer-primary">{label}</span>
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
      <header className="space-y-2">
        <h1 className="md-page-title">مرحباً بك، {user.name}</h1>
        <p className="text-sm text-exeer-muted">
          نظرة عامة على نشاط المنشأة اليوم
        </p>
      </header>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <PlgOnboardingBanner employeeCount={stats.employeeCount} />

      <section
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="إحصائيات سريعة"
      >
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} isLoading={isLoading} />
        ))}
      </section>

      <section className="grid flex-1 grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <h2 className="text-xl font-bold text-exeer-primary">المهام الذكية</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

        <div className="space-y-5">
          <h2 className="text-xl font-bold text-exeer-primary">الطلبات المعلقة</h2>
          <div className="md-surface min-h-[320px] p-5 lg:min-h-[calc(100%-2.5rem)]">
            {isLoading ? (
              <p className="py-16 text-center text-sm text-exeer-muted">
                جاري التحميل...
              </p>
            ) : pendingPreview.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-exeer-surface text-exeer-muted">
                  <Package className="h-8 w-8 stroke-[1.75]" aria-hidden />
                </span>
                <p className="max-w-[220px] text-sm font-medium leading-relaxed text-exeer-muted">
                  لا توجد طلبات معلقة حالياً
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {pendingPreview.map((request) => (
                  <li
                    key={request.id}
                    className="rounded-2xl border border-exeer-border bg-exeer-surface px-4 py-3"
                  >
                    <p className="text-sm font-bold text-exeer-primary">
                      {request.employee_name}
                    </p>
                    <p className="mt-1 text-xs text-exeer-muted">
                      {request.request_type}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

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
    </div>
  );
}
