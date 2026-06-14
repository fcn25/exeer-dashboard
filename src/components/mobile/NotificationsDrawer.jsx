import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import ExeerEmptyState from "../brand/ExeerEmptyState.jsx";
import {
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationsService.js";
import { ensureArray } from "../../utils/ensureArray.js";

const TYPE_ICONS = {
  request_approved: CheckCircle2,
  new_employee: UserPlus,
  subscription_alert: AlertTriangle,
  evaluation_assigned: ClipboardCheck,
  account_deletion_request: Trash2,
};

const TYPE_ACCENTS = {
  request_approved: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
  new_employee: "text-md-primary bg-md-primary-container/60 dark:bg-[#1e3a5f]/60 dark:text-[#93c5fd]",
  subscription_alert: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40",
  evaluation_assigned: "text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40",
  account_deletion_request: "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40",
};

function NotificationItem({ item, locale, onMarkRead }) {
  if (!item?.id) return null;

  const Icon = TYPE_ICONS[item?.type] ?? Bell;
  const accent = TYPE_ACCENTS[item?.type] ?? "text-exeer-muted bg-exeer-surface";

  const handleClick = async () => {
    if (item?.is_read) return;
    try {
      await markNotificationRead(item.id);
      onMarkRead(item.id);
    } catch {
      // ignore — item stays visually unread
    }
  };

  let relativeTime = "";
  try {
    relativeTime = formatDistanceToNow(new Date(item?.created_at), {
      addSuffix: true,
      locale,
    });
  } catch {
    relativeTime = "";
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-full gap-3 rounded-md px-4 py-3 text-right transition-colors hover:bg-exeer-hover ${
        item?.is_read ? "opacity-80" : "bg-md-primary-container/20 dark:bg-[#1e3a5f]/20"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${accent}`}
      >
        <Icon className="h-5 w-5 stroke-[1.75]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold text-exeer-primary">
            {item?.title ?? "—"}
          </span>
          {!item?.is_read ? (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-md-primary" aria-hidden />
          ) : null}
        </span>
        <span className="block text-xs leading-relaxed text-exeer-muted">
          {item?.message ?? ""}
        </span>
        {relativeTime ? (
          <span className="block text-[11px] text-exeer-muted">{relativeTime}</span>
        ) : null}
      </span>
    </button>
  );
}

function filterMobileNotifications(items, hideSubscriptionAlerts) {
  if (!hideSubscriptionAlerts) return ensureArray(items);
  return ensureArray(items).filter((item) => item?.type !== "subscription_alert");
}

export default function NotificationsDrawer({ isOpen, onClose, userId, onUnreadChange }) {
  const { i18n } = useTranslation();
  const location = useLocation();
  const hideSubscriptionAlerts = location.pathname.startsWith("/mobile");
  const locale = i18n.language?.startsWith("en") ? enUS : ar;
  const dir = i18n.language?.startsWith("en") ? "ltr" : "rtl";

  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const syncUnreadCount = useCallback(
    (items) => {
      const unread = ensureArray(items).filter((item) => !item?.is_read).length;
      onUnreadChange?.(unread);
    },
    [onUnreadChange],
  );

  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError("");

    try {
      const items = filterMobileNotifications(
        await listUserNotifications(userId),
        hideSubscriptionAlerts,
      );
      setNotifications(items);
      syncUnreadCount(items);
    } catch (err) {
      setError(err.message || "تعذّر تحميل الإشعارات.");
    } finally {
      setIsLoading(false);
    }
  }, [hideSubscriptionAlerts, syncUnreadCount, userId]);

  useEffect(() => {
    if (!isOpen) return;
    loadNotifications();
  }, [isOpen, loadNotifications]);

  const handleMarkRead = (id) => {
    setNotifications((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, is_read: true } : item,
      );
      syncUnreadCount(next);
      return next;
    });
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(userId);
      setNotifications((prev) => {
        const next = prev.map((item) => ({ ...item, is_read: true }));
        syncUnreadCount(next);
        return next;
      });
    } catch (err) {
      setError(err.message || "تعذّر تحديث الإشعارات.");
    }
  };

  if (!isOpen) return null;

  const safeNotifications = ensureArray(notifications);
  const unreadCount = safeNotifications.filter((item) => !item?.is_read).length;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/35 backdrop-blur-[2px]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="إغلاق"
        onClick={onClose}
      />

      <aside
        dir={dir}
        lang={i18n.language?.startsWith("en") ? "en" : "ar"}
        className="relative flex h-full w-full max-w-[480px] flex-col border-s border-exeer-border bg-md-surface dark:border-slate-700 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-drawer-title"
      >
        <div className="native-mobile-overlay-top flex items-start justify-between gap-4 border-b border-exeer-border px-5 py-4">
          <div className="space-y-1">
            <h2 id="notifications-drawer-title" className="text-lg font-bold text-exeer-primary">
              الإشعارات
            </h2>
            {unreadCount > 0 ? (
              <p className="text-xs text-exeer-muted">{unreadCount} غير مقروء</p>
            ) : (
              <p className="text-xs text-exeer-muted">كل شيء محدّث</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-md-primary hover:underline"
              >
                قراءة الكل
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {isLoading ? (
            <div className="px-4 py-12 text-center text-sm text-exeer-muted">
              جاري التحميل...
            </div>
          ) : error ? (
            <p className="mx-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : safeNotifications.length ? (
            <ul className="space-y-1">
              {safeNotifications.map((item) => (
                <li key={item?.id ?? item?.title}>
                  <NotificationItem
                    item={item}
                    locale={locale}
                    onMarkRead={handleMarkRead}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <ExeerEmptyState
              message="لا توجد إشعارات — ستظهر التحديثات المهمة هنا."
            />
          )}
        </div>
      </aside>
    </div>
  );
}
