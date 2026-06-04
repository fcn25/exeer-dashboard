import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Check,
  GraduationCap,
  Loader2,
  TrendingUp,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { isDirectManager } from "../utils/rbac.js";
import {
  listMyTeamEmployees,
  listTeamPendingRequests,
  MANAGER_HR_REQUEST_TYPES,
  REQUEST_STATUS_LABELS,
  submitManagerHrRequest,
  updateTeamRequestStatus,
} from "../services/myTeamService.js";

const TABS = [
  { id: "employees", label: "موظفي فريقي" },
  { id: "team-requests", label: "طلبات الفريق" },
  { id: "hr-requests", label: "طلباتي للإدارة" },
];

const HR_REQUEST_ICONS = {
  training: GraduationCap,
  hiring: UserPlus,
  promotion: TrendingUp,
  evaluation: UserCheck,
  administrative: Briefcase,
};

function StatusBadge({ status }) {
  const label = REQUEST_STATUS_LABELS[status] ?? status;
  const tone =
    status === "Approved"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : status === "Rejected"
        ? "bg-red-50 text-red-800 border-red-200"
        : "bg-amber-50 text-amber-900 border-amber-200";

  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${tone}`}
    >
      {label}
    </span>
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
      <div className="md-surface w-full max-w-lg p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3
            id="manager-hr-request-title"
            className="text-lg font-bold text-exeer-primary"
          >
            {label}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-exeer-muted hover:bg-exeer-surface"
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
            className="md-input w-full resize-y"
            placeholder="اشرح الطلب بوضوح ليراجعه فريق الموارد البشرية..."
            required
          />
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button type="submit" disabled={isSaving} className="md-btn-primary w-full">
            {isSaving ? "جاري الإرسال..." : "إرسال للإدارة"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function MyTeamDashboard() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState("employees");
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
    <div className="md-page">
      <header className="space-y-2">
        <h1 className="md-page-title">فريق العمل</h1>
        <p className="text-sm text-exeer-muted">
          {managerView
            ? "إدارة موظفيك، اعتماد طلباتهم، ورفع الطلبات للموارد البشرية."
            : "متابعة فرق المدراء المباشرين وطلباتهم المعلقة."}
        </p>
      </header>

      <nav
        role="tablist"
        aria-label="تبويبات فريق العمل"
        className="mb-6 flex flex-wrap gap-4 border-b border-exeer-border pb-2 sm:gap-6"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-exeer-primary text-exeer-primary"
                  : "border-transparent text-exeer-muted hover:text-exeer-primary"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {loadError ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </p>
      ) : null}

      {actionError ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </p>
      ) : null}

      {hrSuccess ? (
        <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {hrSuccess}
        </p>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-exeer-muted">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          جاري التحميل...
        </div>
      ) : null}

      {!isLoading && activeTab === "employees" ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {team.length === 0 ? (
            <p className="col-span-full rounded-md border border-exeer-border bg-white px-4 py-8 text-center text-sm text-exeer-muted dark:bg-slate-900">
              لا يوجد موظفون مرتبطون بفريقك حالياً.
            </p>
          ) : (
            team.map((member) => (
              <article key={member.id} className="md-surface space-y-2 p-4">
                <p className="font-bold text-exeer-primary">{member.full_name}</p>
                <p className="text-xs text-exeer-muted">
                  {member.job_title_name || "—"} · {member.department || "—"}
                </p>
                <p className="text-xs text-exeer-muted">{member.email || "—"}</p>
                <p className="text-xs">
                  <span className="text-exeer-muted">المدير المباشر: </span>
                  {member.direct_manager_name || "—"}
                </p>
              </article>
            ))
          )}
        </section>
      ) : null}

      {!isLoading && activeTab === "team-requests" ? (
        <section className="space-y-4">
          {requests.length === 0 ? (
            <p className="rounded-md border border-exeer-border bg-white px-4 py-8 text-center text-sm text-exeer-muted dark:bg-slate-900">
              لا توجد طلبات معلقة بانتظار موافقتك.
            </p>
          ) : (
            requests.map((request) => {
              const member = teamById.get(Number(request.employee_id));
              return (
                <article
                  key={request.id}
                  className="md-surface space-y-3 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-exeer-primary">
                        {member?.full_name ?? `موظف #${request.employee_id}`}
                      </p>
                      <p className="text-xs text-exeer-muted">
                        {request.request_type} ·{" "}
                        {new Date(request.created_at).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="text-sm leading-relaxed text-exeer-primary">
                    {request.details}
                  </p>
                  {managerView ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actingRequestId === request.id}
                        onClick={() =>
                          handleRequestAction(request.id, "Approved")
                        }
                        className="md-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                      >
                        <Check className="h-4 w-4" aria-hidden />
                        موافقة
                      </button>
                      <button
                        type="button"
                        disabled={actingRequestId === request.id}
                        onClick={() =>
                          handleRequestAction(request.id, "Rejected")
                        }
                        className="md-btn-tonal inline-flex items-center gap-2 px-4 py-2 text-sm"
                      >
                        <X className="h-4 w-4" aria-hidden />
                        رفض
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      ) : null}

      {!isLoading && activeTab === "hr-requests" ? (
        <section className="grid gap-3 sm:grid-cols-2">
          {MANAGER_HR_REQUEST_TYPES.map((item) => {
            const Icon = HR_REQUEST_ICONS[item.id] ?? Briefcase;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setHrModalKind(item.id)}
                className="md-surface flex items-center gap-3 p-4 text-start transition-shadow hover:shadow-sm"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-md-primary-container text-md-primary dark:bg-slate-800">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="font-semibold text-exeer-primary">
                  {item.label}
                </span>
              </button>
            );
          })}
        </section>
      ) : null}

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
