import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Smartphone,
} from "lucide-react";
import ErrorToast from "../components/ui/ErrorToast.jsx";
import DashboardTopBar from "../components/layout/DashboardTopBar.jsx";
import SystemCalendarPanel from "../components/calendar/SystemCalendarPanel.jsx";
import QuickStickyNote from "../components/notes/QuickStickyNote.jsx";
import { getMyQuickNote } from "../services/quickNotesService.js";
import { signOut } from "../utils/mobileAuth.js";
import { useAuth } from "../context/AuthContext.jsx";
import ExeerLogo from "../components/brand/ExeerLogo.jsx";
import { useAppLocale } from "../i18n/useAppLocale.js";
import { resolveSidebarNavItems } from "../constants/roleNav.js";
import { isOwner } from "../utils/rbac.js";

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
            ? "bg-gray-100 text-slate-900 before:absolute before:inset-y-1 before:start-0 before:w-0.5 before:rounded-full before:bg-slate-900 dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-primary)]"
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
  const location = useLocation();
  const { t, dir, lang } = useAppLocale();
  const { role } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [unauthorizedToast, setUnauthorizedToast] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isStickyNoteOpen, setIsStickyNoteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getMyQuickNote()
      .then((note) => {
        if (cancelled) return;
        const hasContent = Boolean(String(note?.content ?? "").trim());
        if (note?.is_pinned && hasContent) {
          setIsStickyNoteOpen(true);
        }
      })
      .catch(() => {
        // ignore — sticky note stays closed until user opens it
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const message = location.state?.unauthorizedToast;
    if (!message) return;
    setUnauthorizedToast(message);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  const { mainNavItems, systemNavItems } = useMemo(
    () => resolveSidebarNavItems(role, t),
    [role, t],
  );

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/login";
  };

  return (
    <div
      dir={dir}
      lang={lang}
      className="flex h-screen w-screen overflow-hidden bg-md-surface-dim font-sans text-slate-900 dark:bg-[var(--bg-main)] dark:text-[var(--text-primary)]"
    >
      <aside
        className={`flex shrink-0 flex-col border-e border-exeer-border bg-md-surface py-5 transition-[width] duration-200 dark:border-slate-800 dark:bg-slate-950 print:hidden ${
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
                {t("nav.subtitle")}
              </p>
            )}
          </div>
          {isSidebarCollapsed ? null : (
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-slate-500 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-900"
              aria-label={t("nav.collapseSidebar")}
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
            aria-label={t("nav.expandSidebar")}
          >
            <PanelLeftOpen className="h-4 w-4" aria-hidden />
          </button>
        ) : null}

        <nav
          className="flex flex-1 flex-col gap-0.5"
          aria-label={t("nav.mainNav")}
        >
          {mainNavItems.map((item) => (
            <SidebarLink
              key={item.key}
              to={item.to}
              label={item.label}
              icon={item.icon}
              end={item.end}
              collapsed={isSidebarCollapsed}
            />
          ))}

          {systemNavItems.length && !isSidebarCollapsed ? (
            <p className="mt-4 px-3 pb-1 text-[11px] font-semibold tracking-wide text-exeer-muted uppercase">
              {t("nav.systemSection")}
            </p>
          ) : null}

          {systemNavItems.map((item) => (
            <SidebarLink
              key={item.key}
              to={item.to}
              label={item.label}
              icon={item.icon}
              end={item.end}
              collapsed={isSidebarCollapsed}
            />
          ))}
        </nav>

        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-slate-800">
          {isOwner() ? (
            <button
              type="button"
              onClick={() => window.open("/mobile/attendance", "_blank")}
              title={isSidebarCollapsed ? "عرض تطبيق المدير" : undefined}
              className={`relative mb-2 flex w-full items-center gap-3 rounded-md py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-gray-50 hover:text-slate-900 dark:hover:bg-slate-800/60 dark:hover:text-slate-100 ${
                isSidebarCollapsed ? "justify-center px-2" : "px-3"
              }`}
            >
              <Smartphone
                className="h-[18px] w-[18px] shrink-0 stroke-[1.75]"
                aria-hidden
              />
              {isSidebarCollapsed ? null : <span>عرض تطبيق المدير</span>}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            className={`md-btn-tonal w-full ${isSidebarCollapsed ? "px-2 py-2.5 text-xs" : ""}`}
            title={isSidebarCollapsed ? t("common.logout") : undefined}
          >
            {isSidebarCollapsed ? t("common.logoutShort") : t("common.logout")}
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-md-surface-dim dark:bg-[var(--bg-main)]">
          <div className="shrink-0 px-6 md:px-8">
            <DashboardTopBar
              isCalendarOpen={isCalendarOpen}
              onToggleCalendar={() => setIsCalendarOpen((open) => !open)}
              isStickyNoteOpen={isStickyNoteOpen}
              onToggleStickyNote={() => setIsStickyNoteOpen((open) => !open)}
              onLogout={handleLogout}
            />
          </div>
          <main className="min-h-0 flex-1 overflow-y-auto px-6 py-8 md:px-8">
            <Outlet />
          </main>
        </div>

        {isCalendarOpen ? (
          <SystemCalendarPanel onClose={() => setIsCalendarOpen(false)} />
        ) : null}
      </div>

      <QuickStickyNote
        isOpen={isStickyNoteOpen}
        onClose={() => setIsStickyNoteOpen(false)}
      />

      <ErrorToast
        message={unauthorizedToast}
        onDismiss={() => setUnauthorizedToast("")}
      />
    </div>
  );
}
