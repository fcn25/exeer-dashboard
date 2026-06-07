import { useState } from "react";
import { PERFORMANCE_TABS } from "../constants/performanceTemplates.js";
import CyclesTab from "../components/performance/CyclesTab.jsx";
import ExecutiveSummaryTab from "../components/performance/ExecutiveSummaryTab.jsx";
import TemplatesTab from "../components/performance/TemplatesTab.jsx";
import { HOME_SHELL } from "../components/home/homeStyles.js";
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
        className={`${HOME_SHELL} mb-6 grid grid-cols-1 gap-2 bg-[#F8FAFC] p-2 sm:grid-cols-3`}
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
                  ? "bg-[#0F172A] text-white shadow-none"
                  : "border border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#CBD5E1] hover:text-[#0F172A]"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "bg-[#EEF2FF] text-[#4F46E5]"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold leading-snug">
                  {t(`pages.performance.tabs.${tab.id}.label`)}
                </span>
                <span
                  className={`mt-0.5 block text-[11px] font-normal leading-relaxed ${
                    isActive ? "text-white/75" : "text-[#94A3B8]"
                  }`}
                >
                  {t(`pages.performance.tabs.${tab.id}.hint`)}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="min-w-0 flex-1">
        {activeTab === "templates" ? <TemplatesTab /> : null}
        {activeTab === "cycles" ? <CyclesTab /> : null}
        {activeTab === "summary" ? <ExecutiveSummaryTab /> : null}
      </div>
    </div>
  );
}
