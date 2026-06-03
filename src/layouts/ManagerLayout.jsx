import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import {
  Banknote,
  Calendar,
  CheckSquare,
  Home,
  Lock,
  Settings,
  Target,
  UserPlus,
  Users,
} from "lucide-react";
import { signOut } from "../utils/mobileAuth.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  canAccessPerformance,
  canAccessSettings,
  canEditEmployeeRecords,
  canManageEvents,
  isOwner,
} from "../utils/rbac.js";

function SidebarLink({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? "bg-gray-100 text-slate-900 before:absolute before:inset-y-1 before:start-0 before:w-0.5 before:rounded-full before:bg-slate-900"
            : "text-slate-500 hover:bg-gray-50 hover:text-slate-900"
        }`
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0 stroke-[1.75]" aria-hidden />
      <span>{label}</span>
    </NavLink>
  );
}

export default function ManagerLayout() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { permissions, role } = useAuth();
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

    if (isOwner()) {
      items.push({
        to: "/dashboard/payroll",
        label: "مسير الرواتب",
        icon: Banknote,
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
      className="flex h-screen w-screen overflow-hidden bg-white font-sans text-slate-900"
    >
      <aside className="flex w-64 shrink-0 flex-col border-e border-gray-200 bg-white px-3 py-5 print:hidden">
        <div className="mb-6 px-2">
          <p className="text-lg font-semibold tracking-tight text-slate-900">
            Exeer
          </p>
          <p className="mt-0.5 text-xs text-slate-500">لوحة المدير</p>
        </div>

        {canEditEmployeeRecords() ? (
          <button
            type="button"
            onClick={() => navigate("/dashboard/employees?add=1")}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-md border border-slate-900 bg-slate-900 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            <UserPlus className="h-4 w-4 stroke-[1.75]" aria-hidden />
            إضافة موظف جديد
          </button>
        ) : null}

        <nav
          className="flex flex-1 flex-col gap-0.5"
          aria-label="القائمة الرئيسية"
        >
          {navItems.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>

        <div className="mt-4 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="md-btn-tonal w-full"
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-gray-50/50 px-6 py-8 md:px-8 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
