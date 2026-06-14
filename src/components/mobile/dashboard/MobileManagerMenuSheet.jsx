import { Bell, FileText, LogOut, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import ThemeToggle from "../../settings/ThemeToggle.jsx";
import LanguageToggle from "../LanguageToggle.jsx";

function MenuRowButton({ icon: Icon, label, onClick, badge, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-exeer-border bg-md-surface px-4 py-3.5 text-start transition-colors hover:bg-exeer-hover dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-surface-hover)]"
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-md-primary-container text-exeer-primary dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-primary)]">
        <Icon className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
        {badge > 0 ? (
          <span className="absolute -top-1 end-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-md-primary px-1 text-[9px] font-bold text-white dark:bg-[var(--accent-color)] dark:text-[#131314]">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-exeer-primary dark:text-[var(--text-primary)]">
          {label}
        </span>
        {hint ? (
          <span className="block text-[11px] text-exeer-muted dark:text-[var(--text-secondary)]">
            {hint}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export default function MobileManagerMenuSheet({
  isOpen,
  onClose,
  unreadCount = 0,
  notesCount = 0,
  onOpenNotifications,
  onOpenNotes,
  onLogout,
}) {
  const { t, i18n } = useTranslation();
  const dir = i18n.language?.startsWith("en") ? "ltr" : "rtl";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-start bg-black/35 backdrop-blur-[2px]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t("common.close")}
        onClick={onClose}
      />

      <div
        dir={dir}
        className="native-mobile-overlay-top relative mx-auto mt-0 w-full max-w-[480px] border-b border-exeer-border bg-md-surface shadow-none dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-manager-menu-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-exeer-border px-4 py-3 dark:border-[var(--border-color)]">
          <h2
            id="mobile-manager-menu-title"
            className="text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]"
          >
            {t("nav.managerMenu")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover dark:border-[var(--border-color)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-surface-hover)]"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="max-h-[min(70vh,520px)] space-y-4 overflow-y-auto px-4 py-4">
          <div className="md-surface-muted space-y-3 rounded-xl p-4 dark:bg-[var(--bg-main)]">
            <p className="md-label dark:text-[var(--text-secondary)]">
              {t("settings.general.languageLabel")}
            </p>
            <LanguageToggle />
          </div>

          <div className="md-surface-muted space-y-3 rounded-xl p-4 dark:bg-[var(--bg-main)]">
            <p className="md-label dark:text-[var(--text-secondary)]">
              {t("settings.appearance.themeLabel")}
            </p>
            <ThemeToggle />
          </div>

          <div className="space-y-2">
            <MenuRowButton
              icon={Bell}
              label={t("nav.notifications")}
              badge={unreadCount}
              onClick={() => {
                onClose();
                onOpenNotifications?.();
              }}
            />
            <MenuRowButton
              icon={FileText}
              label={t("notes.panelTitle", { defaultValue: "الملاحظات" })}
              hint={
                notesCount > 0
                  ? t("notes.countHint", {
                      defaultValue: "{{count}} ملاحظة",
                      count: notesCount,
                    })
                  : undefined
              }
              onClick={() => {
                onClose();
                onOpenNotes?.();
              }}
            />
          </div>
        </div>

        <div className="border-t border-exeer-border px-4 py-3 dark:border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout?.();
            }}
            className="md-btn-tonal inline-flex w-full items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {t("common.logout")}
          </button>
        </div>
      </div>
    </div>
  );
}
