import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  FileText,
  Globe,
  HelpCircle,
  Lightbulb,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import {
  listPendingRequests,
  updateRequestStatus,
} from "./services/requestsService.js";
import { getUserDisplay, signOut } from "./utils/mobileAuth.js";
import SmartTasksModal from "./components/SmartTasksModal.jsx";
import SmartGoalsModal from "./components/SmartGoalsModal.jsx";

const SMART_TASKS_ID = "smart-tasks";
const SMART_GOALS_ID = "smart-goal";

const SMART_SERVICES = [
  { id: "smart-goal", label: "الهدف الذكي", icon: Target },
  { id: "smart-interview", label: "المقابلة الذكية", icon: MessageSquare },
  { id: "smart-tasks", label: "المهام الذكية", icon: Sparkles },
  { id: "monthly-report", label: "التقرير الشهري", icon: FileText },
  { id: "advisor", label: "المستشار الإداري", icon: Lightbulb },
];

const QUICK_SERVICES = [
  {
    id: "employee-requests",
    label: "طلبات الموظفين",
    icon: ClipboardList,
    tint: "bg-blue-50 text-blue-700",
  },
  {
    id: "performance",
    label: "تحليل الأداء",
    icon: BarChart3,
    tint: "bg-emerald-50 text-emerald-700",
  },
  {
    id: "profiles",
    label: "الملفات الشخصية",
    icon: Users,
    tint: "bg-violet-50 text-violet-700",
  },
];

const MENU_ITEMS = [
  { id: "settings", label: "الإعدادات", icon: Settings },
  { id: "language", label: "تغيير اللغة", icon: Globe },
  { id: "logout", label: "تسجيل الخروج", icon: LogOut },
  { id: "help", label: "مساعدة", icon: HelpCircle },
];

function normalizePendingRequests(data) {
  const list = Array.isArray(data)
    ? data
    : data?.requests ??
      data?.items ??
      data?.records ??
      data?.data ??
      [];

  if (!Array.isArray(list)) return [];

  return list.map((item, index) => {
    const id = item.id ?? `request-${index}`;
    const employeeName = String(
      item.employee_name ??
        item.employeeName ??
        item.name ??
        item.employee?.name ??
        "—",
    );
    const requestType = String(
      item.request_type ?? item.type ?? item.category ?? "طلب",
    );

    const detailFields = [
      ["الوصف", item.description ?? item.details ?? item.note],
      ["التاريخ", item.created_at ?? item.date],
      ["الحالة", item.status],
      ["ملاحظات", item.notes ?? item.reason],
    ].filter(([, value]) => value != null && String(value).trim() !== "");

    return {
      id,
      employeeName,
      requestType,
      detailFields,
      status: item.status,
    };
  });
}

function MobileNavbar({ user, menuOpen, onToggleMenu, onCloseMenu }) {
  return (
    <header className="relative bg-[#0F172A] px-4 py-3 text-white">
      <div className="grid grid-cols-3 items-center gap-2">
        <div className="flex justify-start">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-bold"
            aria-hidden
          >
            {user?.initials ?? "م"}
          </span>
        </div>

        <p className="text-center text-lg font-bold tracking-tight">Exeer</p>

        <div className="relative flex justify-end">
          <button
            type="button"
            onClick={onToggleMenu}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 transition-colors hover:bg-white/10"
            aria-label="القائمة"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X className="h-5 w-5 stroke-[1.75]" aria-hidden />
            ) : (
              <Menu className="h-5 w-5 stroke-[1.75]" aria-hidden />
            )}
          </button>

          {menuOpen ? (
            <div
              className="absolute top-12 left-0 z-50 min-w-[180px] overflow-hidden rounded-md border border-exeer-border bg-white text-exeer-primary"
              style={{ boxShadow: "none" }}
            >
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === "logout") {
                      signOut().finally(() => {
                        window.location.href = "/";
                      });
                      return;
                    }
                    onCloseMenu();
                  }}
                  className="flex w-full items-center gap-3 border-b border-exeer-border px-4 py-3 text-sm font-medium last:border-b-0 hover:bg-[#F8FAFC]"
                >
                  <item.icon className="h-4 w-4 stroke-[1.75]" aria-hidden />
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function PendingRequestCard({ request, onUpdateStatus, isUpdating }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      className="rounded-md border border-exeer-border bg-[#F8FAFC] p-4"
      style={{ boxShadow: "none" }}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full text-start"
      >
        <p className="text-sm font-bold text-[#0F172A]">{request?.employeeName ?? "—"}</p>
        <p className="mt-1 text-xs text-slate-500">{request?.requestType ?? "—"}</p>
      </button>

      {expanded ? (
        <div className="mt-3 space-y-2 rounded-lg border border-exeer-border bg-white p-3 text-xs text-slate-600">
          {(request?.detailFields ?? []).length > 0 ? (
            (request?.detailFields ?? []).map(([label, value]) => (
              <p key={label}>
                <span className="font-semibold text-[#0F172A]">{label}: </span>
                {String(value)}
              </p>
            ))
          ) : (
            <p>لا توجد تفاصيل إضافية</p>
          )}
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onUpdateStatus(request.id, "approved")}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-50"
        >
          ✓ موافقة
        </button>
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onUpdateStatus(request.id, "rejected")}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
        >
          ✗ رفض
        </button>
      </div>
    </article>
  );
}

export default function MobileDashboard() {
  const user = getUserDisplay();
  const [menuOpen, setMenuOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [updatingRequestId, setUpdatingRequestId] = useState(null);
  const [isSmartTasksOpen, setIsSmartTasksOpen] = useState(false);
  const [isSmartGoalsOpen, setIsSmartGoalsOpen] = useState(false);

  const fetchPendingRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    setRequestsError("");

    try {
      const rows = await listPendingRequests();
      setRequests(normalizePendingRequests(rows));
    } catch (err) {
      setRequestsError(err.message || "تعذّر تحميل الطلبات.");
      setRequests([]);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const handleUpdateStatus = async (requestId, status) => {
    setUpdatingRequestId(requestId);

    try {
      const nextStatus = status === "approved" ? "موافق" : "مرفوض";
      await updateRequestStatus(requestId, nextStatus);
      setRequests((prev) => prev.filter((request) => request.id !== requestId));
    } catch (err) {
      setRequestsError(err.message || "تعذّر تحديث الطلب.");
    } finally {
      setUpdatingRequestId(null);
    }
  };

  return (
    <div
      dir="rtl"
      lang="ar"
      className="mx-auto min-h-screen w-full max-w-[400px] bg-white font-sans text-[#0F172A]"
      style={{ boxShadow: "none" }}
    >
      <MobileNavbar
        user={user}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((prev) => !prev)}
        onCloseMenu={() => setMenuOpen(false)}
      />

      <main className="space-y-6 px-4 py-5">
        <section aria-label="طلبات الموظفين المعلقة">
          <h2 className="mb-3 text-base font-bold text-[#0F172A]">
            طلبات الموظفين المعلقة
          </h2>

          {isLoadingRequests ? (
            <p className="rounded-md border border-exeer-border bg-[#F8FAFC] p-4 text-center text-sm text-slate-500">
              جاري تحميل الطلبات...
            </p>
          ) : requestsError ? (
            <p className="rounded-md border border-exeer-border bg-[#F8FAFC] p-4 text-center text-sm text-slate-500">
              {requestsError}
            </p>
          ) : requests.length === 0 ? (
            <p className="rounded-md border border-exeer-border bg-[#F8FAFC] p-4 text-center text-sm text-slate-500">
              لا توجد طلبات معلقة
            </p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <PendingRequestCard
                  key={request.id}
                  request={request}
                  isUpdating={updatingRequestId === request.id}
                  onUpdateStatus={handleUpdateStatus}
                />
              ))}
            </div>
          )}
        </section>

        <section aria-label="الخدمات الذكية">
          <h2 className="mb-3 text-base font-bold text-[#0F172A]">
            الخدمات الذكية
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {SMART_SERVICES.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={
                  service.id === SMART_TASKS_ID
                    ? () => setIsSmartTasksOpen(true)
                    : service.id === SMART_GOALS_ID
                      ? () => setIsSmartGoalsOpen(true)
                      : undefined
                }
                className="flex flex-col items-center justify-center gap-2 rounded-md border border-exeer-border bg-white px-2 py-4 transition-colors hover:bg-[#F8FAFC]"
              >
                <service.icon
                  className="h-6 w-6 stroke-[1.75] text-[#0F172A]"
                  aria-hidden
                />
                <span className="text-center text-[11px] font-medium leading-tight text-[#0F172A]">
                  {service.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section aria-label="خدمات سريعة">
          <h2 className="mb-3 text-base font-bold text-[#0F172A]">
            خدمات سريعة
          </h2>
          <div className="overflow-hidden rounded-md border border-exeer-border bg-[#F8FAFC]">
            {QUICK_SERVICES.map((service, index) => (
              <button
                key={service.id}
                type="button"
                className={`flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-white ${
                  index < QUICK_SERVICES.length - 1
                    ? "border-b border-exeer-border"
                    : ""
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${service.tint}`}
                >
                  <service.icon className="h-5 w-5 stroke-[1.75]" aria-hidden />
                </span>
                <span className="flex-1 text-sm font-medium text-[#0F172A]">
                  {service.label}
                </span>
                <ChevronLeft
                  className="h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden
                />
              </button>
            ))}
          </div>
        </section>
      </main>

      <SmartTasksModal
        isOpen={isSmartTasksOpen}
        onClose={() => setIsSmartTasksOpen(false)}
      />

      <SmartGoalsModal
        isOpen={isSmartGoalsOpen}
        onClose={() => setIsSmartGoalsOpen(false)}
      />
    </div>
  );
}
