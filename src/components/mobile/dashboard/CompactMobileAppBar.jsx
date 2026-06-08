import { useCallback, useEffect, useState } from "react";
import { Bell, Settings } from "lucide-react";
import { useAuth } from "../../../context/AuthContext.jsx";
import { useCurrentEmployee } from "../../../hooks/useCurrentEmployee.js";
import { countUnreadNotifications } from "../../../services/notificationsService.js";
import { getTimeBasedGreeting } from "../../../utils/portalGreeting.js";
import NotificationsDrawer from "../NotificationsDrawer.jsx";
import MobileSettingsDrawer from "../MobileSettingsDrawer.jsx";

function HeaderIconButton({ label, onClick, children, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-exeer-primary transition-colors hover:bg-exeer-hover dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-surface-hover)]"
    >
      {children}
      {badge > 0 ? (
        <span className="absolute -top-0.5 end-0 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-md-primary px-1 text-[9px] font-bold leading-none text-white dark:bg-[var(--accent-color)] dark:text-[#131314]">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </button>
  );
}

export default function CompactMobileAppBar({
  employeeName,
  roleLabel,
  profileImageUrl,
  variant = "employee",
  menuButton = null,
}) {
  const { user } = useAuth();
  const { employeeId, authUserId } = useCurrentEmployee();
  const greeting = getTimeBasedGreeting();
  const userId = authUserId ?? user?.id;

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const isManager = variant === "manager";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-exeer-border bg-md-surface/95 backdrop-blur-sm dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]/95">
        <div className="mx-auto flex max-w-[480px] items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-exeer-primary dark:text-[var(--text-primary)]">
              {greeting}، {employeeName}
              {roleLabel ? (
                <span className="font-medium text-exeer-muted dark:text-[var(--text-secondary)]">
                  {" "}
                  — {roleLabel}
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            {isManager ? (
              menuButton
            ) : (
              <>
                <HeaderIconButton
                  label="الإشعارات"
                  badge={unreadCount}
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setIsNotificationsOpen(true);
                  }}
                >
                  <Bell className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
                </HeaderIconButton>
                <HeaderIconButton
                  label="الإعدادات"
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    setIsSettingsOpen(true);
                  }}
                >
                  <Settings className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
                </HeaderIconButton>
              </>
            )}
          </div>
        </div>
      </header>

      {!isManager ? (
        <>
          <NotificationsDrawer
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
            userId={userId}
            onUnreadChange={setUnreadCount}
          />

          <MobileSettingsDrawer
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            employeeId={employeeId}
            fullName={employeeName}
            imageUrl={profileImageUrl}
          />
        </>
      ) : null}
    </>
  );
}
