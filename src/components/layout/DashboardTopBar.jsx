import { CalendarDays, LogOut } from "lucide-react";
import { useAppLocale } from "../../i18n/useAppLocale.js";

const ICON_BTN =
  "flex h-9 w-9 items-center justify-center rounded-md border border-[#E2E8F0] text-[#0F172A] transition-colors hover:bg-[#F8FAFC] dark:border-slate-600 dark:text-white dark:hover:bg-slate-800";

const ICON_BTN_ACTIVE =
  "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900";

export default function DashboardTopBar({
  isCalendarOpen,
  onToggleCalendar,
  onLogout,
}) {
  const { t } = useAppLocale();

  return (
    <div className="sticky top-0 z-30 flex shrink-0 items-center justify-end gap-2 border-b border-exeer-border bg-gray-50/95 px-0 py-3 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
      <button
        type="button"
        onClick={onToggleCalendar}
        className={`${ICON_BTN} ${isCalendarOpen ? ICON_BTN_ACTIVE : ""}`}
        aria-label={t("nav.openCalendar")}
        aria-pressed={isCalendarOpen}
      >
        <CalendarDays className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onLogout}
        className={ICON_BTN}
        aria-label={t("common.logout")}
      >
        <LogOut className="h-[18px] w-[18px] stroke-[1.75]" aria-hidden />
      </button>
    </div>
  );
}
