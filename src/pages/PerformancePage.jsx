import { useState } from "react";
import { PERFORMANCE_TABS } from "../constants/performanceTemplates.js";
import { HOME_SHELL, TYPE_ITEM, TYPE_META } from "../components/home/homeStyles.js";
import { useAppLocale } from "../i18n/useAppLocale.js";

export default function PerformancePage() {
  const { t } = useAppLocale();
  const [activeTab, setActiveTab] = useState("templates");

  return (
    <div className="md-page">
      <header className="space-y-2">
        <h1 className="md-page-title">{t("pages.performance.title")}</h1>
        <p className="text-sm text-exeer-muted">
          {t("pages.performance.subtitle")}
        </p>
      </header>

      <nav
        role="tablist"
        aria-label={t("pages.performance.title")}
        className={`${HOME_SHELL} mb-6 grid grid-cols-1 gap-2 bg-[#F8FAFC] p-2 dark:bg-[var(--bg-surface)] sm:grid-cols-3`}
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
                isActive
                  ? "bg-[#0F172A] text-white shadow-none dark:border dark:border-[var(--border-color)] dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-primary)]"
                  : "border border-[#F0F0F0] bg-white text-[#6B7280] hover:border-[#E5E5E5] hover:text-[#111111] dark:border-[var(--border-color)] dark:bg-[var(--bg-main)] dark:text-[var(--text-secondary)] dark:hover:border-[var(--border-color)] dark:hover:text-[var(--text-primary)]"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${
                  isActive
                    ? "bg-white/15 text-white dark:bg-[var(--text-primary)]/15 dark:text-[var(--text-primary)]"
                    : "bg-[#EEF2FF] text-[#4F46E5] dark:bg-[var(--bg-surface)] dark:text-[var(--accent-color)]"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className={`block ${TYPE_ITEM} leading-snug`}>
                  {t(`pages.performance.tabs.${tab.id}.label`)}
                </span>
                <span
                  className={`${TYPE_META} mt-0.5 block leading-relaxed ${
                    isActive ? "text-white/75 dark:text-[var(--text-secondary)]" : ""
                  }`}
                >
                  {t(`pages.performance.tabs.${tab.id}.hint`)}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div
        className={`${HOME_SHELL} flex min-h-[240px] items-center justify-center p-8 text-center`}
      >
        <p className="max-w-md text-sm text-exeer-muted">
          جارٍ إعادة بناء نظام الأداء. هذا القسم سيعود قريباً بالتصميم الجديد.
        </p>
      </div>
    </div>
  );
}
