import { useCallback, useEffect, useState } from "react";
import { Bell, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { countUnreadNotifications } from "../../services/notificationsService.js";
import { getTimeBasedGreeting } from "../../utils/portalGreeting.js";
import NotificationsDrawer from "./NotificationsDrawer.jsx";
import MobileSettingsDrawer from "./MobileSettingsDrawer.jsx";

function HeaderIconButton({ label, onClick, children, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-exeer-primary transition-colors hover:bg-exeer-hover"
    >
      {children}
      {badge > 0 ? (
        <span className="absolute -top-0.5 end-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-md-primary px-1 text-[10px] font-bold leading-none text-white dark:bg-[#2563eb]">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </button>
  );
}

export default function MobileHeader({
  userId,
  employeeName,
  profileImageUrl,
}) {
  const greeting = getTimeBasedGreeting();

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
      // silent — badge stays at last known count
    }
  }, [userId]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-exeer-border bg-md-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[480px] items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="truncate text-xs font-medium text-exeer-muted">
              {greeting}، {employeeName}
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight text-exeer-primary">
              Exeer
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <HeaderIconButton
              label="الإشعارات"
              badge={unreadCount}
              onClick={() => {
                setIsSettingsOpen(false);
                setIsNotificationsOpen(true);
              }}
            >
              <Bell className="h-5 w-5 stroke-[1.75]" aria-hidden />
            </HeaderIconButton>
            <HeaderIconButton
              label="الإعدادات"
              onClick={() => {
                setIsNotificationsOpen(false);
                setIsSettingsOpen(true);
              }}
            >
              <Settings className="h-5 w-5 stroke-[1.75]" aria-hidden />
            </HeaderIconButton>
          </div>
        </div>
      </header>

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        userId={userId}
        onUnreadChange={setUnreadCount}
      />

      <MobileSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        fullName={employeeName}
        imageUrl={profileImageUrl}
      />
    </>
  );
}
