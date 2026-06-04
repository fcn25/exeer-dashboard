import { useCallback, useEffect, useState } from "react";
import {
  Award,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  LogOut,
  PlayCircle,
  Plus,
  Star,
  Trophy,
  Gavel,
  ChevronLeft,
  BarChart3,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LogAchievementModal from "../components/achievements/LogAchievementModal.jsx";
import MobileHeader from "../components/mobile/MobileHeader.jsx";
import NewRequestSlideover from "../components/portal/NewRequestSlideover.jsx";
import PendingEvaluationsSection from "../components/portal/PendingEvaluationsSection.jsx";
import PersonalMentorCard from "../components/portal/PersonalMentorCard.jsx";
import SuccessToast from "../components/ui/SuccessToast.jsx";
import { normalizeTaskStatus } from "../pages/TasksPage.jsx";
import { fetchPortalSnapshot } from "../services/portalService.js";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_OPTIONS,
  ROUTING_LABELS,
  listEmployeeRequests,
} from "../services/requestsService.js";
import { updateTaskStatus } from "../services/tasksService.js";
import { useAuth } from "../context/AuthContext.jsx";
import EmployeeProfileSummary from "../components/employees/EmployeeProfileSummary.jsx";
import EmployeeAdministrativeInbox from "../components/administrative/EmployeeAdministrativeInbox.jsx";
import {
  canAccessPerformance,
  canManageAdministrativeActions,
} from "../utils/rbac.js";
import { formatDisplayValue } from "../utils/displayValue.js";
import { formatPortalDate, getTimeBasedGreeting } from "../utils/portalGreeting.js";
import { signOut } from "../utils/mobileAuth.js";
import { ensureArray } from "../utils/ensureArray.js";
import MobileLoadingState from "../components/mobile/MobileLoadingState.jsx";

function StatCard({ icon: Icon, value, label, accent = "text-exeer-primary" }) {
  return (
    <article className="md-surface flex flex-col gap-3 p-5 md:p-6">
      <span className={`flex h-10 w-10 items-center justify-center rounded-md bg-exeer-surface ${accent}`}>
        <Icon className="h-5 w-5 stroke-[1.75]" aria-hidden />
      </span>
      <p className="text-3xl font-bold tracking-tight text-exeer-primary">
        {value ?? "—"}
      </p>
      <p className="text-sm font-medium text-exeer-muted">{label}</p>
    </article>
  );
}

function SectionShell({ title, subtitle, action, children }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-exeer-primary">{title}</h2>
          {subtitle ? <p className="text-sm text-exeer-muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function getRequestTypeLabel(value) {
  return REQUEST_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function PortalTaskCard({ task, onStatusChange, isUpdating }) {
  const status = normalizeTaskStatus(task.status);
  const canStart = status === "قيد الانتظار";
  const canComplete = status === "قيد التنفيذ" || status === "قيد الانتظار";

  return (
    <article className="md-surface flex flex-col gap-4 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-exeer-primary">
          {task.title || task.description?.slice(0, 80) || "مهمة"}
        </h3>
        {task.description && task.description !== task.title ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-exeer-muted">
            {task.description}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-exeer-muted">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-exeer-surface px-2.5 py-1">
          <ClipboardList className="h-3.5 w-3.5" aria-hidden />
          {status}
        </span>
        {task.deadline ? (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            {formatPortalDate(task.deadline)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {canStart ? (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onStatusChange(task.id, "قيد التنفيذ")}
            className="md-btn-tonal inline-flex items-center gap-2 px-3 py-2 text-xs"
          >
            <PlayCircle className="h-4 w-4" aria-hidden />
            بدء المهمة
          </button>
        ) : null}
        {canComplete ? (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onStatusChange(task.id, "مكتملة")}
            className="md-btn-primary inline-flex items-center gap-2 px-3 py-2 text-xs"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            إكمال
          </button>
        ) : null}
      </div>
    </article>
  );
}

function AchievementTimelineItem({ item }) {
  return (
    <li className="relative me-4 border-s-2 border-exeer-border ps-5 pb-5 last:pb-0">
      <span className="absolute -start-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
        <Star className="h-2.5 w-2.5 fill-current" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-bold text-exeer-primary">{item.title}</p>
        <p className="text-xs text-exeer-muted">{formatPortalDate(item.achievement_date)}</p>
        {item.description ? (
          <p className="text-xs leading-relaxed text-exeer-muted">{item.description}</p>
        ) : null}
      </div>
    </li>
  );
}

export default function EmployeePortalPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const isMobileSelfService = location.pathname === "/mobile";
  const pageDir = i18n.language?.startsWith("en") ? "ltr" : "rtl";
  const pageLang = i18n.language?.startsWith("en") ? "en" : "ar";
  const { user } = useAuth();
  const employeeId = user?.employee_id;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [requests, setRequests] = useState([]);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isAchievementOpen, setIsAchievementOpen] = useState(false);
  const [successToast, setSuccessToast] = useState("");

  const loadPortal = useCallback(async () => {
    if (!employeeId) {
      setError("لم يتم ربط حسابك بسجل موظف. تواصل مع الموارد البشرية.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [nextSnapshot, nextRequests] = await Promise.all([
        fetchPortalSnapshot(employeeId),
        listEmployeeRequests(employeeId),
      ]);
      setSnapshot(nextSnapshot ?? null);
      setRequests(ensureArray(nextRequests));
    } catch (err) {
      setError(err.message || "تعذّر تحميل بوابة الموظف.");
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  const handleTaskStatusChange = async (taskId, status) => {
    setUpdatingTaskId(taskId);
    try {
      await updateTaskStatus(taskId, status);
      await loadPortal();
    } catch (err) {
      setError(err.message || "تعذّر تحديث حالة المهمة.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const employeeName =
    snapshot?.employee?.full_name ?? user?.name ?? "موظف";
  const profileImageUrl = snapshot?.employee?.image ?? user?.image ?? null;
  const jobTitle = formatDisplayValue(
    snapshot?.employee?.job_title_name ?? user?.job_title,
  );
  const department = formatDisplayValue(
    snapshot?.employee?.department ?? user?.department,
  );
  const leaveBalanceDisplay = isLoading
    ? "—"
    : formatDisplayValue(snapshot?.stats?.leaveBalance, {
        asNumber: true,
        suffix: "يوم",
      });
  const greeting = getTimeBasedGreeting();
  const showMobileBootstrapLoader =
    isMobileSelfService && isLoading && snapshot == null && !error;

  return (
    <div
      dir={isMobileSelfService ? pageDir : "rtl"}
      lang={isMobileSelfService ? pageLang : "ar"}
      className={`min-h-screen bg-md-surface-dim font-sans text-exeer-primary ${
        isMobileSelfService ? "mx-auto w-full max-w-[480px]" : ""
      }`}
    >
      {isMobileSelfService ? (
        <MobileHeader
          userId={user?.id}
          employeeName={employeeName}
          profileImageUrl={profileImageUrl}
        />
      ) : (
        <header className="border-b border-exeer-border bg-md-surface/90 backdrop-blur-sm">
          <div className="mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 max-w-7xl lg:px-8">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-exeer-muted">
                الخدمة الذاتية
              </p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {greeting}، {employeeName}
              </h1>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="md-btn-tonal inline-flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              تسجيل الخروج
            </button>
          </div>
        </header>
      )}

      <main
        className={`mx-auto space-y-8 px-4 py-8 sm:px-6 ${
          isMobileSelfService ? "max-w-[480px]" : "max-w-7xl lg:px-8"
        }`}
      >
        {showMobileBootstrapLoader ? (
          <MobileLoadingState label="جاري تحميل بوابة الموظف..." />
        ) : (
        <>
        <section className="md-surface flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-7">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-exeer-surface text-exeer-primary">
              <Briefcase className="h-6 w-6 stroke-[1.75]" aria-hidden />
            </span>
            <div className="space-y-1">
              <p className="text-sm text-exeer-muted">ملخصك الوظيفي</p>
              <p className="text-lg font-bold">{jobTitle}</p>
              <p className="text-sm text-exeer-muted">{department}</p>
            </div>
          </div>
        </section>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}

        <section
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          aria-label="إحصائيات سريعة"
        >
          <StatCard
            icon={ClipboardList}
            value={isLoading ? "—" : snapshot?.stats.pendingTasks}
            label="المهام المعلقة"
          />
          <StatCard
            icon={Trophy}
            value={isLoading ? "—" : snapshot?.stats.totalAchievements}
            label="إجمالي الإنجازات"
            accent="text-amber-700 dark:text-amber-300"
          />
          <StatCard
            icon={Award}
            value={leaveBalanceDisplay}
            label="رصيد الإجازات المتاح"
            accent="text-emerald-700 dark:text-emerald-300"
          />
        </section>

        {isMobileSelfService && canManageAdministrativeActions() ? (
          <Link
            to="/mobile/administrative-actions"
            className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-3.5 text-slate-900 shadow-none transition-colors hover:bg-gray-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-slate-700">
              <Gavel className="h-5 w-5" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold">الإجراءات الإدارية</span>
              <span className="block text-xs text-slate-500">
                إصدار إجراء أو مراجعة السجل
              </span>
            </span>
            <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          </Link>
        ) : null}

        {isMobileSelfService && canAccessPerformance() ? (
          <Link
            to="/mobile/performance"
            className="flex min-h-[56px] items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-3.5 text-slate-900 shadow-none transition-colors hover:bg-gray-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-slate-700">
              <BarChart3 className="h-5 w-5" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold">قياس الأداء</span>
              <span className="block text-xs text-slate-500">
                الملخص التنفيذي، الدورات، وإطلاق التقييم
              </span>
            </span>
            <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          </Link>
        ) : null}

        {isMobileSelfService ? (
          <SectionShell title="ملفي الشخصي" subtitle="بياناتك من سجل الموارد البشرية">
            <EmployeeProfileSummary
              employee={snapshot?.employee}
              isLoading={isLoading}
            />
          </SectionShell>
        ) : null}

        {employeeId ? (
          <SectionShell
            title="سجلاتي الإدارية"
            subtitle="إجراءات الموارد البشرية الصادرة بحقك — للعرض فقط"
          >
            <EmployeeAdministrativeInbox employeeId={employeeId} />
          </SectionShell>
        ) : null}

        <div
          className={`grid grid-cols-1 gap-8 ${
            isMobileSelfService ? "" : "xl:grid-cols-12"
          }`}
        >
          <div className={`space-y-8 ${isMobileSelfService ? "" : "xl:col-span-7"}`}>
            <SectionShell
              title="مهامي"
              subtitle="المهام المُسندة إليك"
            >
              {isLoading ? (
                <div className="md-surface-muted px-4 py-8 text-center text-sm text-exeer-muted">
                  جاري التحميل...
                </div>
              ) : ensureArray(snapshot?.tasks).length ? (
                <div className="grid gap-4">
                  {ensureArray(snapshot?.tasks).map((task) =>
                    task?.id != null ? (
                    <PortalTaskCard
                      key={task.id}
                      task={{
                        ...task,
                        title: task?.title || task?.description?.slice(0, 80),
                      }}
                      onStatusChange={handleTaskStatusChange}
                      isUpdating={updatingTaskId === task.id}
                    />
                    ) : null,
                  )}
                </div>
              ) : (
                <div className="md-surface-muted rounded-md px-4 py-10 text-center">
                  <p className="text-sm text-exeer-muted">لا توجد مهام مسندة إليك حالياً.</p>
                </div>
              )}
            </SectionShell>

            <SectionShell
              title="إنجازاتي"
              subtitle="سجل إنجازاتك المهنية"
              action={
                <button
                  type="button"
                  onClick={() => setIsAchievementOpen(true)}
                  className="md-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  إضافة إنجاز
                </button>
              }
            >
              {isLoading ? (
                <div className="md-surface-muted px-4 py-8 text-center text-sm text-exeer-muted">
                  جاري التحميل...
                </div>
              ) : ensureArray(snapshot?.achievements).length ? (
                <ol className="md-surface px-5 py-5">
                  {ensureArray(snapshot?.achievements).map((item) =>
                    item?.id != null ? (
                      <AchievementTimelineItem key={item.id} item={item} />
                    ) : null,
                  )}
                </ol>
              ) : (
                <div className="md-surface-muted rounded-md px-4 py-10 text-center">
                  <p className="text-sm text-exeer-muted">لم تُسجّل إنجازات بعد.</p>
                </div>
              )}
            </SectionShell>

            <SectionShell title="التقييمات" subtitle="التقييمات المطلوبة منك">
              <PendingEvaluationsSection
                employeeId={employeeId}
                onEvaluationSubmitted={() =>
                  setSuccessToast("تم حفظ التقييم بنجاح.")
                }
              />
            </SectionShell>
          </div>

          <div className={`space-y-8 ${isMobileSelfService ? "" : "xl:col-span-5"}`}>
            <SectionShell
              title="الطلبات"
              subtitle="تقديم ومتابعة طلباتك"
              action={
                <button
                  type="button"
                  onClick={() => setIsRequestOpen(true)}
                  className="md-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  طلب جديد
                </button>
              }
            >
              <div className="md-surface overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-right text-sm">
                    <thead>
                      <tr className="border-b border-exeer-border bg-exeer-surface text-xs text-exeer-muted">
                        <th className="px-4 py-3 font-medium">النوع</th>
                        <th className="px-4 py-3 font-medium">الحالة</th>
                        <th className="px-4 py-3 font-medium">التوجيه</th>
                        <th className="px-4 py-3 font-medium">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-exeer-muted">
                            جاري التحميل...
                          </td>
                        </tr>
                      ) : requests.length ? (
                        requests.map((request) => (
                          <tr
                            key={request.id}
                            className="border-b border-exeer-border last:border-0"
                          >
                            <td className="px-4 py-3 font-medium">
                              {getRequestTypeLabel(request.request_type)}
                            </td>
                            <td className="px-4 py-3">
                              {REQUEST_STATUS_LABELS[request.status] ?? request.status}
                            </td>
                            <td className="px-4 py-3 text-exeer-muted">
                              {ROUTING_LABELS[request.routing_to] ?? request.routing_to}
                            </td>
                            <td className="px-4 py-3 text-exeer-muted">
                              {formatPortalDate(request.created_at)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-exeer-muted">
                            لا توجد طلبات سابقة.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionShell>

            <PersonalMentorCard employeeId={employeeId} />
          </div>
        </div>
        </>
        )}
      </main>

      <NewRequestSlideover
        isOpen={isRequestOpen}
        onClose={() => setIsRequestOpen(false)}
        employeeId={employeeId}
        onSuccess={loadPortal}
      />

      <LogAchievementModal
        isOpen={isAchievementOpen}
        onClose={() => setIsAchievementOpen(false)}
        employeeId={employeeId}
        employeeName={employeeName}
        onSuccess={loadPortal}
      />

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
    </div>
  );
}
