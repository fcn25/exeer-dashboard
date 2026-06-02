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
import { useAuth } from "../providers/AuthProvider.jsx";
import {
  canAccessPerformance,
  canAccessSettings,
  canEditEmployeeRecords,
  canViewPayroll,
  isAdmin,
} from "../utils/rbac.js";

function SidebarLink({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
          isActive
            ? "bg-md-primary text-white dark:bg-[#2563eb] dark:text-white"
            : "text-exeer-muted hover:bg-exeer-hover hover:text-exeer-primary"
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0 stroke-[1.75]" aria-hidden />
      <span>{label}</span>
    </NavLink>
  );
}

export default function ManagerLayout() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { role } = useAuth();
  const dir = i18n.language?.startsWith("en") ? "ltr" : "rtl";
  const lang = i18n.language?.startsWith("en") ? "en" : "ar";

  const navItems = useMemo(() => {
    const items = [
      { to: "/dashboard", label: "الرئيسية", icon: Home, end: true },
      { to: "/dashboard/tasks", label: "المهام", icon: CheckSquare },
      { to: "/dashboard/events", label: "الفعاليات", icon: Calendar },
      { to: "/dashboard/employees", label: "الموظفين", icon: Users },
    ];

    if (canViewPayroll()) {
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

    if (isAdmin()) {
      items.push({
        to: "/dashboard/permissions",
        label: "الصلاحيات",
        icon: Lock,
      });
    }

    return items;
  }, [role]);

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <div
      dir={dir}
      lang={lang}
      className="flex h-screen w-screen overflow-hidden bg-md-surface-dim font-sans text-exeer-primary"
    >
      <aside className="flex w-72 shrink-0 flex-col border-l border-exeer-border bg-md-surface px-4 py-6 md-elevated">
        <div className="mb-8 px-2">
          <p className="text-center text-2xl font-bold tracking-tight text-exeer-primary">
            Exeer
          </p>
          <p className="mt-1 text-center text-xs text-exeer-muted">
            لوحة المدير
          </p>
        </div>

        {canEditEmployeeRecords() ? (
          <button
            type="button"
            onClick={() => navigate("/dashboard/employees?add=1")}
            className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-exeer-primary px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <UserPlus className="h-5 w-5 stroke-[1.75]" aria-hidden />
            إضافة موظف جديد
          </button>
        ) : null}

        <nav
          className="flex flex-1 flex-col gap-1.5"
          aria-label="القائمة الرئيسية"
        >
          {navItems.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>

        <div className="mt-6 border-t border-exeer-border pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="md-btn-tonal w-full"
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-6 py-8 md:px-10 md:py-10">
        <Outlet />
      </main>
    </div>
  );
}
