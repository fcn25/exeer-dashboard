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
  EMPLOYEE_FAB_ACTIONS,
  EMPLOYEE_TABS,
} from "./mobileDashboardConfig.js";

export default function EmployeeMobileDashboard({
  employeeName,
  profileImageUrl,
  role,
  dashboardData,
  isLoading,
  error,
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

  const resolvedRole = dashboardData?.employee?.role ?? role ?? user?.role;
  const roleLabel =
    ROLE_LABELS[resolvedRole] ?? ROLE_LABELS.Employee;
  const displayName =
    dashboardData?.employee?.full_name ?? employeeName ?? user?.name ?? "موظف";

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
      setSuccessToast("سيتم فتح نموذج الاستئذان قريباً");
    }
  };

  return (
    <div
      dir={pageDir}
      lang={pageLang}
      className="mx-auto min-h-screen w-full max-w-[480px] bg-gray-50/80 pb-28 font-sans text-exeer-primary"
    >
      <CompactMobileAppBar
        employeeName={displayName}
        roleLabel={roleLabel}
        profileImageUrl={profileImageUrl ?? dashboardData?.employee?.image}
      />

      <main className="space-y-4 px-4 py-4">
        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <AttendanceHorizontalWidget
          attendance={dashboardData?.attendance}
          isLoading={isLoading}
        />
        <BentoStatGrid stats={dashboardData?.bentoStats} isLoading={isLoading} />

        <MobileTabBar
          tabs={EMPLOYEE_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <MobileTabPanels
          activeTab={activeTab}
          data={dashboardData?.tabData}
          isLoading={isLoading}
        />
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
