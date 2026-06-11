import { useState } from "react";
import { PERFORMANCE_TABS } from "../constants/performanceTemplates.js";
import {
  HOME_CARD,
  HOME_TEXT_HINT,
  HOME_TEXT_TITLE,
  ICON_CHIP,
  TAB_ACTIVE,
  TAB_INACTIVE,
  TYPE_ITEM,
  TYPE_META,
} from "../components/home/homeStyles.js";
import { useAppLocale } from "../i18n/useAppLocale.js";

export default function PerformancePage() {
  const { t } = useAppLocale();
  const [activeTab, setActiveTab] = useState("templates");

  return (
    <div className="-mx-6 -my-8 flex flex-col gap-8 bg-md-surface-dim px-6 py-8 dark:bg-[var(--bg-main)] md:-mx-8 md:px-8">
      <header className={HOME_CARD}>
        <h1 className={`text-[24px] font-semibold ${HOME_TEXT_TITLE}`}>
          {t("pages.performance.title")}
        </h1>
        <p className={`${HOME_TEXT_HINT} mt-1`}>{t("pages.performance.subtitle")}</p>
      </header>

      <nav
        role="tablist"
        aria-label={t("pages.performance.title")}
        className={`${HOME_CARD} grid grid-cols-1 gap-2 p-2 sm:grid-cols-3`}
      >
        {PERFORMANCE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-[72px] items-center gap-3 rounded-[12px] px-4 py-3 text-start transition-colors ${
                isActive ? TAB_ACTIVE : TAB_INACTIVE
              }`}
            >
              <span
                className={
                  isActive
                    ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white/15 text-white dark:bg-[var(--text-primary)]/15 dark:text-[var(--text-primary)]"
                    : ICON_CHIP
                }
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span
                  className={`block leading-snug ${
                    isActive
                      ? "text-[0.9375rem] font-semibold text-white dark:text-[var(--text-primary)]"
                      : TYPE_ITEM
                  }`}
                >
                  {t(`pages.performance.tabs.${tab.id}.label`)}
                </span>
                <span
                  className={`mt-0.5 block leading-relaxed ${
                    isActive
                      ? "text-[0.8125rem] font-normal text-white/75 dark:text-[var(--text-secondary)]"
                      : TYPE_META
                  }`}
                >
                  {t(`pages.performance.tabs.${tab.id}.hint`)}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className={`${HOME_CARD} flex min-h-[240px] items-center justify-center text-center`}>
        <p className={`max-w-md ${HOME_TEXT_HINT}`}>
          جارٍ إعادة بناء نظام الأداء. هذا القسم سيعود قريباً بالتصميم الجديد.
        </p>
      </div>
    </div>
  );
}
