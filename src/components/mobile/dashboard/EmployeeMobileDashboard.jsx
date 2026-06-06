import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ROLE_LABELS } from "../../../constants/roles.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import SuccessToast from "../../ui/SuccessToast.jsx";
import CompactMobileAppBar from "./CompactMobileAppBar.jsx";
import AttendanceHorizontalWidget from "./AttendanceHorizontalWidget.jsx";
import BentoStatGrid from "./BentoStatGrid.jsx";
import MobileTabBar from "./MobileTabBar.jsx";
import MobileTabPanels from "./MobileTabPanels.jsx";
import MobileFab from "./MobileFab.jsx";
import {
  EMPLOYEE_BENTO_STATS,
  EMPLOYEE_FAB_ACTIONS,
  EMPLOYEE_TABS,
  MOCK_ACHIEVEMENTS,
  MOCK_EMPLOYEE_REQUESTS,
  MOCK_EMPLOYEE_TASKS,
  MOCK_EVALUATIONS,
} from "./mobileDashboardMockData.js";

export default function EmployeeMobileDashboard({
  employeeName,
  profileImageUrl,
  role,
  onNewRequest,
  onAddAchievement,
}) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const pageDir = i18n.language?.startsWith("en") ? "ltr" : "rtl";
  const pageLang = i18n.language?.startsWith("en") ? "en" : "ar";

  const [activeTab, setActiveTab] = useState("requests");
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [successToast, setSuccessToast] = useState("");

  const roleLabel =
    ROLE_LABELS[role] ?? ROLE_LABELS[user?.role] ?? ROLE_LABELS.Employee;

  const tabData = {
    requests: MOCK_EMPLOYEE_REQUESTS,
    tasks: MOCK_EMPLOYEE_TASKS,
    evaluations: MOCK_EVALUATIONS,
    achievements: MOCK_ACHIEVEMENTS,
  };

  const handleFabAction = (actionId) => {
    if (actionId === "new-request") {
      onNewRequest?.();
      return;
    }
    if (actionId === "add-achievement") {
      onAddAchievement?.();
      return;
    }
    if (actionId === "permission") {
      setSuccessToast("سيتم فتح نموذج الاستئذان قريباً (تجريبي)");
    }
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
        <BentoStatGrid stats={EMPLOYEE_BENTO_STATS} />

        <MobileTabBar
          tabs={EMPLOYEE_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <MobileTabPanels activeTab={activeTab} data={tabData} />
      </main>

      <MobileFab
        isOpen={isFabOpen}
        onToggle={() => setIsFabOpen((open) => !open)}
        actions={EMPLOYEE_FAB_ACTIONS}
        onAction={handleFabAction}
      />

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
    </div>
  );
}
