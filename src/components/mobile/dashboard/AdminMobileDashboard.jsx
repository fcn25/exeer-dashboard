import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROLE_LABELS } from "../../../constants/roles.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import {
  QuickCreateProvider,
  useQuickCreate,
} from "../../../context/QuickCreateContext.jsx";
import { useCurrentEmployee } from "../../../hooks/useCurrentEmployee.js";
import { countUnreadNotifications } from "../../../services/notificationsService.js";
import { listWorkspaceNotes } from "../../../services/quickNotesService.js";
import { signOut } from "../../../utils/mobileAuth.js";
import SystemCalendarPanel from "../../calendar/SystemCalendarPanel.jsx";
import NotesPanel from "../../notes/NotesPanel.jsx";
import NotificationsDrawer from "../NotificationsDrawer.jsx";
import MobileSettingsDrawer from "../MobileSettingsDrawer.jsx";
import SuccessToast from "../../ui/SuccessToast.jsx";
import ErrorToast from "../../ui/ErrorToast.jsx";
import { MOBILE_CARD, MOBILE_SHELL } from "../../home/homeStyles.js";
import CompactMobileAppBar from "./CompactMobileAppBar.jsx";
import MobileManagerBottomNav from "./MobileManagerBottomNav.jsx";
import MobileManagerHomeContent from "./MobileManagerHomeContent.jsx";
import MobileManagerMenuSheet from "./MobileManagerMenuSheet.jsx";
import MobileManagerAttendanceTab from "./MobileManagerAttendanceTab.jsx";
import { QueryPanel } from "../../../features/agent/index.js";

export default function AdminMobileDashboard(props) {
  return (
    <QuickCreateProvider>
      <AdminMobileDashboardShell {...props} />
    </QuickCreateProvider>
  );
}

function AdminMobileDashboardShell({
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

  const {
    isNotesDrawerOpen,
    setIsNotesDrawerOpen,
    openNoteForm,
    notesRefreshKey,
  } = useQuickCreate();
  const [activeNav, setActiveNav] = useState("home");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isQueryOpen, setIsQueryOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notesCount, setNotesCount] = useState(0);
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
    refreshNotesCount();
  }, [refreshUnreadCount, refreshNotesCount]);

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
    await refreshNotesCount();
  };

  return (
    <div
      dir={pageDir}
      lang={pageLang}
      className={`${MOBILE_SHELL} native-mobile-shell--bottom-nav`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <CompactMobileAppBar
        variant="manager"
        employeeName={displayName}
        roleLabel={roleLabel}
        profileImageUrl={profileImageUrl}
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
            onOpenQuery={() => setIsQueryOpen(true)}
          />
        ) : null}

        {activeNav === "calendar" ? (
          <div className={`-mx-4 overflow-hidden ${MOBILE_CARD} p-0`}>
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
        notesCount={notesCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenNotes={() => setIsNotesDrawerOpen(true)}
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

      <QueryPanel isOpen={isQueryOpen} onClose={() => setIsQueryOpen(false)} />

      {isNotesDrawerOpen ? (
        <div className="fixed inset-0 z-[75] flex justify-end bg-black/30">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="إغلاق"
            onClick={() => setIsNotesDrawerOpen(false)}
          />
          <div className="relative h-full w-full max-w-[420px] shadow-none">
            <NotesPanel
              embedded
              onClose={() => setIsNotesDrawerOpen(false)}
              onOpenNoteForm={openNoteForm}
              refreshKey={notesRefreshKey}
            />
          </div>
        </div>
      ) : null}

      <SuccessToast message={successToast} onDismiss={() => setSuccessToast("")} />
      <ErrorToast message={errorToast} onDismiss={() => setErrorToast("")} />
    </div>
  );
}
