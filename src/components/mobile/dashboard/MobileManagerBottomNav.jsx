import { CalendarDays, Fingerprint, Home, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

const NAV_ITEMS = [
  { id: "home", labelKey: "nav.home", icon: Home },
  { id: "calendar", labelKey: "nav.calendar", icon: CalendarDays },
  { id: "settings", labelKey: "nav.settings", icon: Settings },
  { id: "attendance", labelKey: "nav.fingerprint", icon: Fingerprint },
];

export default function MobileManagerBottomNav({ activeId, onChange }) {
  const { t } = useTranslation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-exeer-border bg-md-surface-dim/95 backdrop-blur-md dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]/95"
      aria-label={t("nav.mainNav")}
    >
      <div className="mx-auto flex max-w-[480px] items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
        {NAV_ITEMS.map(({ id, labelKey, icon: Icon }) => {
          const isActive = activeId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-semibold transition-colors ${
                isActive
                  ? "text-exeer-primary dark:text-[var(--text-primary)]"
                  : "text-exeer-muted dark:text-[var(--text-secondary)]"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-colors ${
                  isActive
                    ? "bg-md-primary-container text-exeer-primary dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-primary)]"
                    : "text-exeer-muted dark:text-[var(--text-secondary)]"
                }`}
              >
                <Icon className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
              </span>
              <span className="truncate">{t(labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
