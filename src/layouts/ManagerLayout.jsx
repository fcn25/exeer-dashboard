import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  Banknote,
  Calendar,
  Clock,
  CheckSquare,
  Home,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Target,
  UserPlus,
  Users,
} from "lucide-react";
import { signOut } from "../utils/mobileAuth.js";
import { useAuth } from "../context/AuthContext.jsx";
import ExeerLogo from "../components/brand/ExeerLogo.jsx";
import {
  canAccessPerformance,
  canAccessSettings,
  canEditEmployeeRecords,
  canManageEvents,
  canViewPayroll,
} from "../utils/rbac.js";

function SidebarLink({ to, label, icon: Icon, end, collapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `relative flex w-full items-center gap-3 rounded-md py-2.5 text-sm font-medium transition-colors ${
          collapsed ? "justify-center px-2" : "px-3"
        } ${
          isActive
            ? "bg-gray-100 text-slate-900 before:absolute before:inset-y-1 before:start-0 before:w-0.5 before:rounded-full before:bg-slate-900 dark:bg-slate-800 dark:text-slate-100"
            : "text-slate-500 hover:bg-gray-50 hover:text-slate-900 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
        }`
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0 stroke-[1.75]" aria-hidden />
      {collapsed ? null : <span>{label}</span>}
    </NavLink>
  );
}

export default function ManagerLayout() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { permissions, role } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const dir = i18n.language?.startsWith("en") ? "ltr" : "rtl";
  const lang = i18n.language?.startsWith("en") ? "en" : "ar";

  const navItems = useMemo(() => {
    const items = [
      { to: "/dashboard", label: "الرئيسية", icon: Home, end: true },
      { to: "/dashboard/tasks", label: "المهام", icon: CheckSquare },
    ];

    if (canManageEvents()) {
      items.push({
        to: "/dashboard/events",
        label: "الفعاليات",
        icon: Calendar,
      });
    }

    if (canEditEmployeeRecords()) {
      items.push({
        to: "/dashboard/employees",
        label: "الموظفين",
        icon: Users,
      });
    }

    if (canViewPayroll()) {
      items.push({
        to: "/dashboard/payroll",
        label: "مسير الرواتب",
        icon: Banknote,
      });
      items.push({
        to: "/dashboard/attendance",
        label: "الحضور والانصراف",
        icon: Clock,
      });
    }

    if (canAccessPerformance()) {
      items.push({
        to: "/dashboard/performance",
        label: "إدارة الأداء",
        icon: Target,
      });
    }

    if (canAccessSettings()) {
      items.push({
        to: "/dashboard/settings",
        label: "الإعدادات",
        icon: Settings,
      });
    }

    if (isOwner()) {
      items.push({
        to: "/dashboard/permissions",
        label: "الصلاحيات",
        icon: Lock,
      });
    }

    return items;
  }, [permissions, role]);

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/login";
  };

  return (
    <div
      dir={dir}
      lang={lang}
      className="flex h-screen w-screen overflow-hidden bg-white font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100"
    >
      <aside
        className={`flex shrink-0 flex-col border-e border-gray-200 bg-white py-5 transition-[width] duration-200 dark:border-slate-800 dark:bg-slate-950 print:hidden ${
          isSidebarCollapsed ? "w-[4.25rem] px-2" : "w-64 px-3"
        }`}
      >
        <div
          className={`mb-5 flex items-center ${
            isSidebarCollapsed ? "justify-center" : "justify-between gap-2 px-1"
          }`}
        >
          <div className={isSidebarCollapsed ? "" : "min-w-0 flex-1"}>
            <ExeerLogo
              collapsed={isSidebarCollapsed}
              className="h-9 w-auto max-w-full object-contain object-start"
              symbolClassName="h-8 w-8 object-contain"
            />
            {isSidebarCollapsed ? null : (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                لوحة المدير
              </p>
            )}
          </div>
          {isSidebarCollapsed ? null : (
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-slate-500 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-900"
              aria-label="طي القائمة"
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        {isSidebarCollapsed ? (
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="mb-4 flex w-full items-center justify-center rounded-md border border-gray-200 py-2 text-slate-500 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-900"
            aria-label="توسيع القائمة"
          >
            <PanelLeftOpen className="h-4 w-4" aria-hidden />
          </button>
        ) : null}

        {canEditEmployeeRecords() && !isSidebarCollapsed ? (
          <button
            type="button"
            onClick={() => navigate("/dashboard/employees?add=1")}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-md border border-slate-900 bg-slate-900 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <UserPlus className="h-4 w-4 stroke-[1.75]" aria-hidden />
            إضافة موظف جديد
          </button>
        ) : null}

        {canEditEmployeeRecords() && isSidebarCollapsed ? (
          <button
            type="button"
            onClick={() => navigate("/dashboard/employees?add=1")}
            title="إضافة موظف جديد"
            className="mb-4 flex w-full items-center justify-center rounded-md border border-slate-900 bg-slate-900 p-2.5 text-white hover:bg-slate-800 dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
          </button>
        ) : null}

        <nav
          className="flex flex-1 flex-col gap-0.5"
          aria-label="القائمة الرئيسية"
        >
          {navItems.map((item) => (
            <SidebarLink
              key={item.to}
              {...item}
              collapsed={isSidebarCollapsed}
            />
          ))}
        </nav>

        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className={`md-btn-tonal w-full ${isSidebarCollapsed ? "px-2 py-2.5 text-xs" : ""}`}
            title={isSidebarCollapsed ? "تسجيل الخروج" : undefined}
          >
            {isSidebarCollapsed ? "خروج" : "تسجيل الخروج"}
          </button>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-gray-50/50 px-6 py-8 md:px-8 md:py-8 dark:bg-slate-950/50">
        <Outlet />
      </main>
    </div>
  );
}
