import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, ChevronLeft, Gavel } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ROLE_LABELS } from "../../../constants/roles.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import {
  canAccessPerformance,
  canManageAdministrativeActions,
} from "../../../utils/rbac.js";
import SuccessToast from "../../ui/SuccessToast.jsx";
import CompactMobileAppBar from "./CompactMobileAppBar.jsx";
import AttendanceHorizontalWidget from "./AttendanceHorizontalWidget.jsx";
import BentoStatGrid from "./BentoStatGrid.jsx";
import MobileTabBar from "./MobileTabBar.jsx";
import MobileTabPanels from "./MobileTabPanels.jsx";
import MobileFab from "./MobileFab.jsx";
import {
  ADMIN_BENTO_STATS,
  ADMIN_FAB_ACTIONS,
  ADMIN_TABS,
  MOCK_ADMIN_LOGS,
  MOCK_ADMIN_REQUESTS,
  MOCK_ADMIN_TASKS,
  MOCK_EVALUATIONS,
} from "./mobileDashboardMockData.js";

export default function AdminMobileDashboard({
  employeeName,
  profileImageUrl,
  role,
}) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const pageDir = i18n.language?.startsWith("en") ? "ltr" : "rtl";
  const pageLang = i18n.language?.startsWith("en") ? "en" : "ar";

  const [activeTab, setActiveTab] = useState("requests");
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [successToast, setSuccessToast] = useState("");

  const roleLabel = ROLE_LABELS[role] ?? ROLE_LABELS[user?.role] ?? "مدير النظام";

  const tabData = {
    requests: MOCK_ADMIN_REQUESTS,
    tasks: MOCK_ADMIN_TASKS,
    evaluations: MOCK_EVALUATIONS,
    logs: MOCK_ADMIN_LOGS,
  };

  const handleFabAction = (actionId) => {
    const labels = {
      "new-request": "فتح نموذج طلب جديد (تجريبي)",
      "add-task": "فتح نموذج إضافة مهمة (تجريبي)",
      "launch-eval": "فتح إطلاق تقييم (تجريبي)",
      "admin-action": "فتح إجراء إداري (تجريبي)",
    };
    setSuccessToast(labels[actionId] ?? "تم اختيار الإجراء (تجريبي)");
  };

  return (
    <div
      dir={pageDir}
      lang={pageLang}
      className="mx-auto min-h-screen w-full max-w-[480px] bg-gray-50/80 pb-28 font-sans text-exeer-primary"
    >
      <CompactMobileAppBar
        employeeName={employeeName}
        roleLabel={roleLabel}
        profileImageUrl={profileImageUrl}
      />

      <main className="space-y-4 px-4 py-4">
        <AttendanceHorizontalWidget />
        <BentoStatGrid stats={ADMIN_BENTO_STATS} />

        {(canManageAdministrativeActions() || canAccessPerformance()) ? (
          <div className="grid grid-cols-2 gap-3">
            {canManageAdministrativeActions() ? (
              <Link
                to="/mobile/administrative-actions"
                className="flex items-center gap-2.5 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm transition-colors hover:bg-gray-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-exeer-primary">
                  <Gavel className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold">إجراءات إدارية</span>
                </span>
                <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-exeer-muted" aria-hidden />
              </Link>
            ) : null}
            {canAccessPerformance() ? (
              <Link
                to="/mobile/performance"
                className="flex items-center gap-2.5 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm transition-colors hover:bg-gray-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-exeer-primary">
                  <BarChart3 className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold">قياس الأداء</span>
                </span>
                <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-exeer-muted" aria-hidden />
              </Link>
            ) : null}
          </div>
        ) : null}

        <MobileTabBar
          tabs={ADMIN_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <MobileTabPanels activeTab={activeTab} data={tabData} />
      </main>

      <MobileFab
        isOpen={isFabOpen}
        onToggle={() => setIsFabOpen((open) => !open)}
        actions={ADMIN_FAB_ACTIONS}
        onAction={handleFabAction}
      />

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
    </div>
  );
}
