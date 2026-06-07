import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Check,
  ClipboardList,
  GraduationCap,
  Loader2,
  Mail,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { isDirectManager } from "../utils/rbac.js";
import { getUserDisplay } from "../utils/mobileAuth.js";
import {
  HOME_BTN,
  HOME_CARD,
  HOME_SHELL,
  HOME_SURFACE,
  PRIORITY_ICON_STYLES,
} from "../components/home/homeStyles.js";
import PendingRequestCard from "../components/requests/PendingRequestCard.jsx";
import {
  listMyTeamEmployees,
  listTeamPendingRequests,
  MANAGER_HR_REQUEST_TYPES,
  REQUEST_STATUS_LABELS,
  submitManagerHrRequest,
  updateTeamRequestStatus,
} from "../services/myTeamService.js";
import { useAppLocale } from "../i18n/useAppLocale.js";
import {
  formatLocaleDate,
  formatLocaleHeaderDate,
  formatLocaleNumber,
} from "../i18n/formatLocale.js";

const INACTIVE_STATUSES = new Set(["منتهي الخدمة", "موقوف"]);

const HR_REQUEST_ICONS = {
  training: GraduationCap,
  hiring: UserPlus,
  promotion: TrendingUp,
  evaluation: UserCheck,
  administrative: Briefcase,
};

const HR_REQUEST_DESCRIPTIONS = {
  training: "طلب برنامج تدريبي أو دورة لأحد أعضاء الفريق",
  hiring: "طلب توظيف موظف جديد لدعم الفريق",
  promotion: "طلب ترقية موظف بناءً على أدائه",
  evaluation: "طلب دورة تقييم أداء لفريقك",
  administrative: "طلب إجراء إداري من الموارد البشرية",
};

function getGreeting(t) {
  const hour = new Date().getHours();
  if (hour < 12) return t("pages.home.greetingMorning");
  if (hour < 17) return t("pages.home.greetingAfternoon");
  return t("pages.home.greetingEvening");
}

function formatArabicNumber(value) {
  return formatLocaleNumber(value);
}

function isActiveEmployee(member) {
  const status = String(member?.employment_status ?? "نشط").trim();
  return !INACTIVE_STATUSES.has(status);
}

function getInitials(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 1);
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`;
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

function StatusBadge({ status }) {
  const label = REQUEST_STATUS_LABELS[status] ?? status;
  const tone =
    status === "Approved"
      ? { bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" }
      : status === "Rejected"
        ? { bg: "#FEE2E2", color: "#B91C1C", border: "#FECACA" }
        : { bg: "#FEF3C7", color: "#92400E", border: "#FDE68A" };

  return (
    <span
      className="inline-flex rounded-full border px-2.5 py-1 text-[12px] font-medium"
      style={{
        backgroundColor: tone.bg,
        color: tone.color,
        borderColor: tone.border,
      }}
    >
      {label}
    </span>
  );
}

function MiniStatCard({ label, value, sublabel }) {
  return (
    <article className={`${HOME_SURFACE} p-4`}>
      <p className="text-[12px] font-normal text-[#64748B]">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums text-[#0F172A]">
        {value}
      </p>
      {sublabel ? (
        <p className="mt-0.5 text-[11px] font-normal text-[#94A3B8]">{sublabel}</p>
      ) : null}
    </article>
  );
}

function ManagerHrRequestModal({
  isOpen,
  requestKind,
  onClose,
  onSuccess,
  employeeId,
}) {
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const label =
    MANAGER_HR_REQUEST_TYPES.find((item) => item.id === requestKind)?.label ??
    "";

  useEffect(() => {
    if (!isOpen) return;
    setDetails("");
    setError("");
    setIsSaving(false);
  }, [isOpen, requestKind]);

  if (!isOpen || !requestKind) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      await submitManagerHrRequest({ requestKind, details, employeeId });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "تعذّر إرسال الطلب.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manager-hr-request-title"
    >
      <div className={`${HOME_SHELL} w-full max-w-lg p-5 sm:p-6`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3
            id="manager-hr-request-title"
            className="text-[18px] font-medium text-[#0F172A]"
          >
            {label}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={`${HOME_BTN} rounded-full p-1.5 text-[#64748B] hover:bg-[#F8FAFC]`}
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={5}
            className="w-full resize-y rounded-[10px] border border-[#E2E8F0] bg-white px-3 py-2.5 text-[14px] text-[#0F172A] outline-none focus:border-[#0F172A]"
            placeholder="اشرح الطلب بوضوح ليراجعه فريق الموارد البشرية..."
            required
          />
          {error ? <p className="text-[13px] text-[#B91C1C]">{error}</p> : null}
          <button
            type="submit"
            disabled={isSaving}
            className={`${HOME_BTN} w-full rounded-full bg-[#0F172A] px-4 py-2.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50`}
          >
            {isSaving ? "جاري الإرسال..." : "إرسال للإدارة"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function MyTeamDashboard() {
  const { t } = useAppLocale();
  const { user, role } = useAuth();
  const displayUser = getUserDisplay();
  const headerDate = formatLocaleHeaderDate();

  const [team, setTeam] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actingRequestId, setActingRequestId] = useState(null);
  const [hrModalKind, setHrModalKind] = useState(null);
  const [hrSuccess, setHrSuccess] = useState("");

  const managerView = isDirectManager(role);
  const employeeId = user?.employee_id ?? null;

  const teamById = useMemo(() => {
    const map = new Map();
    team.forEach((member) => map.set(Number(member.id), member));
    return map;
  }, [team]);

  const activeCount = useMemo(
    () => team.filter(isActiveEmployee).length,
    [team],
  );

  const departmentCount = useMemo(() => {
    const departments = new Set(
      team.map((member) => String(member.department ?? "").trim()).filter(Boolean),
    );
    return departments.size;
  }, [team]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const employees = await listMyTeamEmployees();
      setTeam(employees);
      const pending = await listTeamPendingRequests(
        employees.map((row) => row.id),
      );
      setRequests(pending);
    } catch (err) {
      setLoadError(err.message || "تعذّر تحميل بيانات الفريق.");
      setTeam([]);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!hrSuccess) return undefined;
    const timer = setTimeout(() => setHrSuccess(""), 4000);
    return () => clearTimeout(timer);
  }, [hrSuccess]);

  const handleRequestAction = async (requestId, status) => {
    setActingRequestId(requestId);
    setActionError("");
    try {
      await updateTeamRequestStatus(requestId, status);
      await loadData();
    } catch (err) {
      setActionError(err.message || "تعذّر تحديث الطلب.");
    } finally {
      setActingRequestId(null);
    }
  };

  return (
    <div className="-mx-6 -my-8 flex flex-col gap-5 bg-[#FFFFFF] px-6 py-8 md:-mx-8 md:px-8">
      {/* ─── ترويسة ─── */}
      <header className={`${HOME_SHELL} p-6`}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-start">
              <p className="text-[13px] font-normal text-[#64748B]">
                {getGreeting(t)}
              </p>
              <h1 className="text-[24px] font-medium text-[#0F172A]">
                {t("pages.myTeam.title")}
              </h1>
              <p className="text-[12px] font-normal text-[#94A3B8]">
                {headerDate}
              </p>
              <p className="pt-1 text-[13px] font-normal text-[#64748B]">
                {managerView
                  ? t("pages.myTeam.subtitleManager")
                  : t("pages.myTeam.subtitleHr")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 sm:shrink-0">
              <PulsePill
                label={`${formatArabicNumber(isLoading ? 0 : team.length)} ${t("pages.myTeam.teamTotal")}`}
                bg="#EEF2FF"
                color="#4F46E5"
              />
              <PulsePill
                label={`${formatArabicNumber(isLoading ? 0 : activeCount)} ${t("pages.myTeam.active")}`}
                bg="#ECFDF5"
                color="#047857"
              />
              <PulsePill
                label={`${formatArabicNumber(isLoading ? 0 : requests.length)} ${t("pages.myTeam.pendingRequests")}`}
                bg={requests.length > 0 ? "#FEE2E2" : "#F1F5F9"}
                color={requests.length > 0 ? "#B91C1C" : "#475569"}
              />
            </div>
          </div>
        </div>
      </header>

      {loadError ? (
        <p
          className={`${HOME_CARD} px-4 py-3 text-[13px] text-[#B91C1C]`}
          style={{ backgroundColor: "#FEE2E2", borderColor: "#FECACA" }}
        >
          {loadError}
        </p>
      ) : null}

      {actionError ? (
        <p
          className={`${HOME_CARD} px-4 py-3 text-[13px] text-[#B91C1C]`}
          style={{ backgroundColor: "#FEE2E2", borderColor: "#FECACA" }}
        >
          {actionError}
        </p>
      ) : null}

      {hrSuccess ? (
        <p
          className={`${HOME_CARD} px-4 py-3 text-[13px] text-[#047857]`}
          style={{ backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }}
        >
          {hrSuccess}
        </p>
      ) : null}

      {/* ─── هيرو 60/40 ─── */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_2fr]">
        <article className={`${HOME_SHELL} p-6`}>
          <p className="text-[14px] font-normal text-[#64748B]">
            إجمالي أعضاء الفريق
          </p>
          <p className="mt-2 tabular-nums">
            <span className="text-[34px] font-semibold text-[#0F172A]">
              {formatArabicNumber(isLoading ? 0 : team.length)}
            </span>
            <span className="ms-1 text-[16px] font-normal text-[#64748B]">
              موظف
            </span>
          </p>
          <p className="mt-1 text-[12px] font-normal text-[#94A3B8]">
            {isLoading
              ? "جاري التحميل..."
              : team.length === 0
                ? "لا يوجد موظفون مرتبطون بفريقك"
                : `${formatArabicNumber(activeCount)} نشط · ${formatArabicNumber(departmentCount)} قسم`}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="text-[13px] font-normal text-[#64748B]">النشطون</p>
              <p className="mt-1 text-[18px] font-semibold tabular-nums text-[#10B981]">
                {formatArabicNumber(isLoading ? 0 : activeCount)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-normal text-[#64748B]">الأقسام</p>
              <p className="mt-1 text-[18px] font-semibold tabular-nums text-[#0F172A]">
                {formatArabicNumber(isLoading ? 0 : departmentCount)}
              </p>
            </div>
          </div>
        </article>

        <article className={`${HOME_SHELL} p-6`}>
          <h2 className="text-[16px] font-medium text-[#0F172A]">
            طلبات بانتظار الموافقة
          </h2>
          <p className="mt-1 text-[12px] font-normal text-[#94A3B8]">
            {isLoading
              ? "جاري التحميل..."
              : requests.length === 0
                ? "لا توجد طلبات معلقة"
                : `${formatArabicNumber(requests.length)} طلب يحتاج مراجعتك`}
          </p>

          <ul className="mt-5 space-y-3">
            {isLoading ? (
              <li className="text-[13px] text-[#94A3B8]">جاري التحميل...</li>
            ) : requests.length === 0 ? (
              <li className="flex items-center gap-2 text-[13px] text-[#64748B]">
                <Check className="h-4 w-4 text-[#10B981]" aria-hidden />
                كل الطلبات مُعالَجة
              </li>
            ) : (
              requests.slice(0, 4).map((request) => {
                const member = teamById.get(Number(request.employee_id));
                return (
                  <li
                    key={request.id}
                    className="flex items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#0F172A]">
                        {member?.full_name ?? `موظف #${request.employee_id}`}
                      </p>
                      <p className="truncate text-[12px] text-[#64748B]">
                        {request.request_type}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </li>
                );
              })
            )}
          </ul>
        </article>
      </section>

      {/* ─── طلبات الفريق ─── */}
      <section
        className={`${HOME_SHELL} border-r-[3px] border-r-[#0F172A] p-6`}
        aria-labelledby="team-requests-heading"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#0F172A]" aria-hidden />
            <h2
              id="team-requests-heading"
              className="text-[18px] font-medium text-[#0F172A]"
            >
              {t("pages.myTeam.contractSection")}
            </h2>
          </div>
          {!isLoading && requests.length > 0 ? (
            <span
              className="inline-flex min-w-6 items-center justify-center rounded-full px-2.5 py-0.5 text-[12px] font-medium"
              style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
            >
              {requests.length}
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-[#94A3B8]">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            جاري التحميل...
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Check className="h-10 w-10 text-[#10B981]" aria-hidden />
            <p className="text-[14px] font-normal text-[#64748B]">
              لا توجد طلبات معلقة بانتظار موافقتك
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((request, index) => {
              const member = teamById.get(Number(request.employee_id));

              return (
                <div
                  key={request.id}
                  className={
                    index < requests.length - 1
                      ? "border-b border-[#F1F5F9] pb-4"
                      : ""
                  }
                >
                  <PendingRequestCard
                    request={request}
                    employeeName={member?.full_name}
                    actingRequestId={actingRequestId}
                    showActions={managerView}
                    onApprove={(requestId) =>
                      handleRequestAction(requestId, "Approved")
                    }
                    onReject={(requestId) =>
                      handleRequestAction(requestId, "Rejected")
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── إحصائيات مصغّرة ─── */}
      <section
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        aria-label="إحصائيات الفريق"
      >
        <MiniStatCard
          label="إجمالي الفريق"
          value={formatArabicNumber(isLoading ? 0 : team.length)}
          sublabel={team.length === 0 ? "لا يوجد موظفون" : null}
        />
        <MiniStatCard
          label="النشطون"
          value={formatArabicNumber(isLoading ? 0 : activeCount)}
          sublabel={
            team.length > 0
              ? `${formatArabicNumber(team.length - activeCount)} غير نشط`
              : null
          }
        />
        <MiniStatCard
          label="طلبات معلّقة"
          value={formatArabicNumber(isLoading ? 0 : requests.length)}
          sublabel={requests.length === 0 ? "لا طلبات بانتظارك" : "تحتاج مراجعة"}
        />
        <MiniStatCard
          label="الأقسام"
          value={formatArabicNumber(isLoading ? 0 : departmentCount)}
          sublabel={departmentCount === 0 ? "—" : "قسم ممثّل في الفريق"}
        />
      </section>

      {/* ─── موظفي فريقي ─── */}
      <section className="space-y-4" aria-labelledby="team-members-heading">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#0F172A]" aria-hidden />
          <h2
            id="team-members-heading"
            className="text-[16px] font-medium text-[#0F172A]"
          >
            {t("pages.myTeam.teamMembers")}
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[#94A3B8]">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            جاري التحميل...
          </div>
        ) : team.length === 0 ? (
          <p
            className={`${HOME_CARD} px-4 py-10 text-center text-[14px] text-[#64748B]`}
          >
            {t("pages.myTeam.noTeam")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {team.map((member) => {
              const active = isActiveEmployee(member);
              return (
                <article
                  key={member.id}
                  className={`${HOME_CARD} flex flex-col gap-3 p-5 hover:bg-[#F8FAFC]`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[14px] font-semibold text-[#4F46E5]">
                      {getInitials(member.full_name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-[#0F172A]">
                        {member.full_name}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-[#64748B]">
                        {member.job_title_name || "—"}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        backgroundColor: active ? "#ECFDF5" : "#F1F5F9",
                        color: active ? "#047857" : "#64748B",
                      }}
                    >
                      {member.employment_status || "نشط"}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[12px] text-[#64748B]">
                    <p>
                      <span className="text-[#94A3B8]">القسم: </span>
                      {member.department || "—"}
                    </p>
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {member.email || "—"}
                    </p>
                    <p>
                      <span className="text-[#94A3B8]">المدير المباشر: </span>
                      {member.direct_manager_name || "—"}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── طلباتي للإدارة ─── */}
      <section
        id="hr-requests"
        className="space-y-4"
        aria-labelledby="hr-requests-heading"
      >
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-[#0F172A]" aria-hidden />
          <h2
            id="hr-requests-heading"
            className="text-[16px] font-medium text-[#0F172A]"
          >
            {t("pages.myTeam.hrRequests")}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MANAGER_HR_REQUEST_TYPES.map((item) => {
            const Icon = HR_REQUEST_ICONS[item.id] ?? Briefcase;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setHrModalKind(item.id)}
                className={`${HOME_CARD} flex min-h-[128px] flex-col items-start gap-3 p-5 text-start hover:bg-[#F8FAFC]`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#EEF2FF] text-[#4F46E5]">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium text-[#0F172A]">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-[12px] font-normal leading-relaxed text-[#64748B]">
                    {HR_REQUEST_DESCRIPTIONS[item.id] ?? ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <ManagerHrRequestModal
        isOpen={Boolean(hrModalKind)}
        requestKind={hrModalKind}
        employeeId={employeeId}
        onClose={() => setHrModalKind(null)}
        onSuccess={() => {
          setHrSuccess("تم إرسال طلبك إلى الموارد البشرية بنجاح.");
          setHrModalKind(null);
        }}
      />
    </div>
  );
}
