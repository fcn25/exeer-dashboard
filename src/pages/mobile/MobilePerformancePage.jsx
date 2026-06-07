import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SuccessToast from "../../components/ui/SuccessToast.jsx";
import MobileExecutiveSummary from "../../components/performance/mobile/MobileExecutiveSummary.jsx";
import MobileCyclesList from "../../components/performance/mobile/MobileCyclesList.jsx";
import MobileLaunchCycleForm from "../../components/performance/mobile/MobileLaunchCycleForm.jsx";
import LocaleShell from "../../components/ui/LocaleShell.jsx";

const TABS = [
  { id: "summary", label: "الملخص التنفيذي" },
  { id: "cycles", label: "الدورات المرسلة" },
  { id: "launch", label: "إطلاق تقييم" },
];

export default function MobilePerformancePage() {
  const [activeTab, setActiveTab] = useState("summary");
  const [successToast, setSuccessToast] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLaunchSuccess = () => {
    setSuccessToast("تم إطلاق دورة التقييم للإدارة المحددة بنجاح");
    setRefreshKey((key) => key + 1);
    setActiveTab("cycles");
  };

  return (
    <LocaleShell className="mx-auto min-h-screen w-full max-w-[480px] overflow-x-hidden bg-white font-sans text-slate-900 dark:bg-[var(--bg-main)] dark:text-[var(--text-primary)]">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-[var(--border-color)] dark:bg-[var(--bg-main)]/95">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            to="/mobile"
            className="flex h-11 w-11 items-center justify-center rounded-md border border-gray-200 text-slate-600"
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">قياس الأداء</h1>
            <p className="text-xs text-slate-500">لوحة تنفيذية للمدير</p>
          </div>
        </div>

        <nav
          className="flex gap-1 overflow-x-auto overscroll-x-contain px-3 pb-3"
          aria-label="أقسام قياس الأداء"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[44px] shrink-0 rounded-md px-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white"
                  : "border border-gray-200 bg-white text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="space-y-4 px-4 py-5 pb-8">
        {activeTab === "summary" ? (
          <MobileExecutiveSummary key={refreshKey} />
        ) : null}
        {activeTab === "cycles" ? <MobileCyclesList key={refreshKey} /> : null}
        {activeTab === "launch" ? (
          <MobileLaunchCycleForm onSuccess={handleLaunchSuccess} />
        ) : null}
      </main>

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
    </LocaleShell>
  );
}
