import { useState } from "react";
import { PERFORMANCE_TABS } from "../constants/performanceTemplates.js";
import CyclesTab from "../components/performance/CyclesTab.jsx";
import ExecutiveSummaryTab from "../components/performance/ExecutiveSummaryTab.jsx";
import TemplatesTab from "../components/performance/TemplatesTab.jsx";

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState("templates");

  return (
    <div className="md-page">
      <header className="space-y-2">
        <h1 className="md-page-title">إدارة الأداء</h1>
        <p className="text-sm text-exeer-muted">
          نماذج التقييم، دورات الأداء، والملخص التنفيذي — في منصة واحدة.
        </p>
      </header>

      <nav
        role="tablist"
        aria-label="تبويبات إدارة الأداء"
        className="mb-6 flex shrink-0 flex-row flex-wrap gap-6 border-b border-exeer-border pb-2"
      >
        {PERFORMANCE_TABS.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-exeer-primary text-exeer-primary"
                  : "border-transparent text-exeer-muted hover:text-exeer-primary"
              }`}
            >
              {tab.label}
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
