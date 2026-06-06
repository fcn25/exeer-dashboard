import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, ChevronLeft, Fingerprint, Gavel } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ROLE_LABELS } from "../../../constants/roles.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import {
  canAccessPerformance,
  canAccessStrategicAI,
  canManageAdministrativeActions,
  canManageAttendanceSettings,
} from "../../../utils/rbac.js";
import MobileSmartToolsGrid from "./MobileSmartToolsGrid.jsx";
import SuccessToast from "../../ui/SuccessToast.jsx";
import CompactMobileAppBar from "./CompactMobileAppBar.jsx";
import AttendanceHorizontalWidget from "./AttendanceHorizontalWidget.jsx";
import BentoStatGrid from "./BentoStatGrid.jsx";
import MobileTabBar from "./MobileTabBar.jsx";
import MobileTabPanels from "./MobileTabPanels.jsx";
import MobileFab from "./MobileFab.jsx";
import {
  ADMIN_FAB_ACTIONS,
  ADMIN_TABS,
} from "./mobileDashboardConfig.js";

export default function AdminMobileDashboard({
  employeeName,
  profileImageUrl,
  role,
  dashboardData,
  isLoading,
  error,
}) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const pageDir = i18n.language?.startsWith("en") ? "ltr" : "rtl";
  const pageLang = i18n.language?.startsWith("en") ? "en" : "ar";

  const [activeTab, setActiveTab] = useState("requests");
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [successToast, setSuccessToast] = useState("");

  const resolvedRole = dashboardData?.employee?.role ?? role ?? user?.role;
  const roleLabel = ROLE_LABELS[resolvedRole] ?? resolvedRole ?? "مدير النظام";
  const displayName =
    dashboardData?.employee?.full_name ?? employeeName ?? user?.name ?? "مدير";

  const handleFabAction = (actionId) => {
    if (actionId === "admin-action") {
      navigate("/mobile/administrative-actions");
      return;
    }
    if (actionId === "launch-eval") {
      navigate("/mobile/performance");
      return;
    }
    const labels = {
      "new-request": "فتح نموذج طلب جديد",
      "add-task": "فتح نموذج إضافة مهمة",
    };
    setSuccessToast(labels[actionId] ?? "تم اختيار الإجراء");
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

        {canAccessStrategicAI() ? <MobileSmartToolsGrid /> : null}

        {(canManageAttendanceSettings() ||
          canManageAdministrativeActions() ||
          canAccessPerformance()) ? (
          <div className="grid grid-cols-2 gap-3">
            {canManageAttendanceSettings() ? (
              <Link
                to="/dashboard/attendance/settings"
                className="col-span-2 flex items-center gap-2.5 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm transition-colors hover:bg-gray-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-exeer-primary">
                  <Fingerprint className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold">إعدادات البصمة والمواقع</span>
                  <span className="block text-[11px] text-exeer-muted">
                    الفروع، النطاقات، وربط الموظفين
                  </span>
                </span>
                <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-exeer-muted" aria-hidden />
              </Link>
            ) : null}
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

        <MobileTabPanels
          activeTab={activeTab}
          data={dashboardData?.tabData}
          isLoading={isLoading}
        />
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
