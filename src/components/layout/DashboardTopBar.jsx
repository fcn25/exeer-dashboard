import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  FileText,
  Languages,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useCurrentEmployee } from "../../hooks/useCurrentEmployee.js";
import { useAppLocale } from "../../i18n/useAppLocale.js";
import { useTheme } from "../../providers/ThemeProvider.jsx";
import { countUnreadNotifications } from "../../services/notificationsService.js";
import { listWorkspaceNotes } from "../../services/quickNotesService.js";
import NotificationsDrawer from "../mobile/NotificationsDrawer.jsx";

const ICON_BTN =
  "relative flex h-9 w-9 items-center justify-center rounded-md border border-[#E2E8F0] text-[#0F172A] transition-colors hover:bg-[#F8FAFC] dark:border-[var(--border-color)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-surface-hover)]";

const ICON_BTN_ACTIVE =
  "border-slate-900 bg-slate-900 text-white dark:border-[var(--text-primary)] dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-primary)]";

function TopBarButton({ label, onClick, children, isActive, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${ICON_BTN} ${isActive ? ICON_BTN_ACTIVE : ""}`}
      aria-label={label}
      aria-pressed={isActive}
    >
      {children}
      {badge > 0 ? (
        <span className="absolute -top-0.5 end-0 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#0F172A] px-1 text-[9px] font-bold leading-none text-white dark:bg-[var(--accent-color)] dark:text-[#131314]">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </button>
  );
}

export default function DashboardTopBar({
  isCalendarOpen,
  onToggleCalendar,
  isNotesOpen,
  onToggleNotes,
  onLogout,
}) {
  const { t, isEn, i18n } = useAppLocale();
  const { isDark, toggleTheme } = useTheme();
  const { authUserId } = useCurrentEmployee();
  const userId = authUserId;

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notesCount, setNotesCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await countUnreadNotifications(userId);
      setUnreadCount(count);
    } catch {
      // silent
    }
  }, [userId]);

  const refreshNotesCount = useCallback(async () => {
    try {
      const notes = await listWorkspaceNotes();
      setNotesCount(notes.length);
    } catch {
      setNotesCount(0);
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    refreshNotesCount();
  }, [refreshNotesCount, isNotesOpen]);

  const handleToggleLanguage = () => {
    i18n.changeLanguage(isEn ? "ar" : "en");
  };

  return (
    <>
      <div className="sticky top-0 z-30 flex shrink-0 items-center justify-end gap-2 border-b border-exeer-border bg-md-surface-dim/95 px-0 py-3 backdrop-blur-sm dark:border-[var(--border-color)] dark:bg-[var(--bg-main)]/95">
        <TopBarButton
          label={t("nav.notifications")}
          badge={unreadCount}
          onClick={() => {
            setIsNotificationsOpen(true);
            refreshUnreadCount();
          }}
        >
          <Bell className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
        </TopBarButton>

        <TopBarButton
          label={t("nav.toggleTheme")}
          onClick={toggleTheme}
        >
          {isDark ? (
            <Sun className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
          ) : (
            <Moon className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
          )}
        </TopBarButton>

        <TopBarButton
          label={t("nav.toggleLanguage")}
          onClick={handleToggleLanguage}
        >
          <Languages className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
          <span className="sr-only">{isEn ? "AR" : "EN"}</span>
        </TopBarButton>

        <TopBarButton
          label={t("notes.panelTitle", { defaultValue: "الملاحظات" })}
          isActive={isNotesOpen}
          onClick={() => {
            onToggleNotes?.();
            window.setTimeout(() => refreshNotesCount(), 400);
          }}
        >
          <FileText className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
          {notesCount > 0 && !isNotesOpen ? (
            <span
              className="absolute bottom-0.5 end-0.5 h-2 w-2 rounded-full bg-[#0F172A] ring-2 ring-white dark:bg-[var(--accent-color)] dark:ring-slate-950"
              aria-hidden
            />
          ) : null}
        </TopBarButton>

        <TopBarButton
          label={t("nav.openCalendar")}
          isActive={isCalendarOpen}
          onClick={onToggleCalendar}
        >
          <CalendarDays className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
        </TopBarButton>

        <TopBarButton label={t("common.logout")} onClick={onLogout}>
          <LogOut className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
        </TopBarButton>
      </div>

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => {
          setIsNotificationsOpen(false);
          refreshUnreadCount();
        }}
        userId={userId}
        onUnreadChange={setUnreadCount}
      />
    </>
  );
}
