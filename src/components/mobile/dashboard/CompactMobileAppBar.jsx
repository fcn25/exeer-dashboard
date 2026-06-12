import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "../../../context/AuthContext.jsx";
import { useCurrentEmployee } from "../../../hooks/useCurrentEmployee.js";
import { countUnreadNotifications } from "../../../services/notificationsService.js";
import { getTimeBasedGreeting } from "../../../utils/portalGreeting.js";
import { MOBILE_APP_BAR } from "../../home/homeStyles.js";
import NotificationsDrawer from "../NotificationsDrawer.jsx";

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
}) {
  const { user } = useAuth();
  const { authUserId } = useCurrentEmployee();
  const greeting = getTimeBasedGreeting();
  const userId = authUserId ?? user?.id;

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
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
      <header className={MOBILE_APP_BAR}>
        <div
          className={`mx-auto flex max-w-[480px] px-4 py-3 ${
            isManager
              ? "flex-col gap-1"
              : "items-start justify-between gap-3"
          }`}
        >
          <div className="min-w-0 flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-exeer-primary dark:text-[var(--text-primary)]">
              {greeting}
            </p>
            <p className="truncate text-xs font-medium text-exeer-muted dark:text-[var(--text-secondary)]">
              {employeeName}
              {roleLabel ? ` — ${roleLabel}` : ""}
            </p>
          </div>

          {!isManager ? (
            <HeaderIconButton
              label="الإشعارات"
              badge={unreadCount}
              onClick={() => setIsNotificationsOpen(true)}
            >
              <Bell className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
            </HeaderIconButton>
          ) : null}
        </div>
      </header>

      {!isManager ? (
        <NotificationsDrawer
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          userId={userId}
          onUnreadChange={setUnreadCount}
        />
      ) : null}
    </>
  );
}
