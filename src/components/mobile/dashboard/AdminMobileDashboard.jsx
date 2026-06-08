import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ROLE_LABELS } from "../../../constants/roles.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { useCurrentEmployee } from "../../../hooks/useCurrentEmployee.js";
import { countUnreadNotifications } from "../../../services/notificationsService.js";
import { getMyQuickNote } from "../../../services/quickNotesService.js";
import { signOut } from "../../../utils/mobileAuth.js";
import SystemCalendarPanel from "../../calendar/SystemCalendarPanel.jsx";
import QuickStickyNote from "../../notes/QuickStickyNote.jsx";
import NotificationsDrawer from "../NotificationsDrawer.jsx";
import MobileSettingsDrawer from "../MobileSettingsDrawer.jsx";
import SuccessToast from "../../ui/SuccessToast.jsx";
import ErrorToast from "../../ui/ErrorToast.jsx";
import CompactMobileAppBar from "./CompactMobileAppBar.jsx";
import MobileManagerBottomNav from "./MobileManagerBottomNav.jsx";
import MobileManagerHomeContent from "./MobileManagerHomeContent.jsx";
import MobileManagerMenuSheet from "./MobileManagerMenuSheet.jsx";
import MobileManagerAttendanceTab from "./MobileManagerAttendanceTab.jsx";

export default function AdminMobileDashboard({
  employeeName,
  profileImageUrl,
  role,
  dashboardData,
  isLoading,
  error,
  onRefresh,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const { employeeId, authUserId } = useCurrentEmployee();
  const pageDir = i18n.language?.startsWith("en") ? "ltr" : "rtl";
  const pageLang = i18n.language?.startsWith("en") ? "en" : "ar";

  const [activeNav, setActiveNav] = useState("home");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isStickyNoteOpen, setIsStickyNoteOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasQuickNote, setHasQuickNote] = useState(false);
  const [successToast, setSuccessToast] = useState("");
  const [errorToast, setErrorToast] = useState("");

  const resolvedRole = dashboardData?.employee?.role ?? role ?? user?.role;
  const roleLabel = ROLE_LABELS[resolvedRole] ?? resolvedRole ?? "مدير النظام";
  const displayName =
    dashboardData?.employee?.full_name ?? employeeName ?? user?.name ?? "مدير";

  const refreshUnreadCount = useCallback(async () => {
    if (!authUserId) {
      setUnreadCount(0);
      return;
    }
    try {
      setUnreadCount(await countUnreadNotifications(authUserId));
    } catch {
      // silent
    }
  }, [authUserId]);

  const refreshQuickNoteState = useCallback(async () => {
    try {
      const note = await getMyQuickNote();
      setHasQuickNote(Boolean(String(note?.content ?? "").trim()));
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    refreshQuickNoteState();
  }, [refreshUnreadCount, refreshQuickNoteState]);

  useEffect(() => {
    const message = location.state?.unauthorizedToast;
    if (!message) return;
    setErrorToast(message);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  const handleNavChange = (id) => {
    if (id === "settings") {
      setIsSettingsOpen(true);
      return;
    }
    setActiveNav(id);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleRefreshHome = async () => {
    await onRefresh?.();
    await refreshQuickNoteState();
  };

  return (
    <div
      dir={pageDir}
      lang={pageLang}
      className="native-mobile-shell native-mobile-shell--bottom-nav mx-auto min-h-screen w-full max-w-[480px] bg-md-surface-dim font-sans text-exeer-primary dark:bg-[var(--bg-main)] dark:text-[var(--text-primary)]"
    >
      <CompactMobileAppBar
        variant="manager"
        employeeName={displayName}
        roleLabel={roleLabel}
        profileImageUrl={profileImageUrl}
        menuButton={
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label={i18n.t("nav.managerMenu")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-exeer-primary transition-colors hover:bg-exeer-hover dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-surface-hover)]"
          >
            <MoreHorizontal className="h-5 w-5 stroke-[1.75]" aria-hidden />
          </button>
        }
      />

      <main className="space-y-4 px-4 py-4">
        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}

        {activeNav === "home" ? (
          <MobileManagerHomeContent
            homeEssentials={dashboardData?.homeEssentials}
            isLoading={isLoading}
            onRefresh={handleRefreshHome}
          />
        ) : null}

        {activeNav === "calendar" ? (
          <div className="-mx-4 overflow-hidden rounded-2xl border border-exeer-border dark:border-[var(--border-color)]">
            <SystemCalendarPanel embedded onClose={() => setActiveNav("home")} />
          </div>
        ) : null}

        {activeNav === "attendance" ? (
          <MobileManagerAttendanceTab employeeId={employeeId} />
        ) : null}
      </main>

      <MobileManagerBottomNav
        activeId={isSettingsOpen ? "settings" : activeNav}
        onChange={handleNavChange}
      />

      <MobileManagerMenuSheet
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        unreadCount={unreadCount}
        hasQuickNote={hasQuickNote}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenQuickNote={() => setIsStickyNoteOpen(true)}
        onLogout={handleSignOut}
      />

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        userId={authUserId}
        onUnreadChange={setUnreadCount}
      />

      <MobileSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        employeeId={employeeId}
        fullName={displayName}
        imageUrl={profileImageUrl}
      />

      <QuickStickyNote
        isOpen={isStickyNoteOpen}
        onClose={() => {
          setIsStickyNoteOpen(false);
          refreshQuickNoteState();
        }}
      />

      <SuccessToast message={successToast} onDismiss={() => setSuccessToast("")} />
      <ErrorToast message={errorToast} onDismiss={() => setErrorToast("")} />
    </div>
  );
}
