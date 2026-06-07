import { useCallback, useEffect, useState } from "react";
import AdminMobileDashboard from "./components/mobile/dashboard/AdminMobileDashboard.jsx";
import { useCurrentEmployee } from "./hooks/useCurrentEmployee.js";
import { getUserDisplay } from "./utils/mobileAuth.js";
import { fetchAdminMobileDashboard } from "./services/mobileDashboardService.js";

/**
 * Legacy entry — delegates to the refactored admin mobile dashboard.
 */
export default function MobileDashboard() {
  const user = getUserDisplay();
  const { employeeId } = useCurrentEmployee();
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await fetchAdminMobileDashboard(employeeId);
      setDashboardData(data);
    } catch (err) {
      setError(err.message || "تعذّر تحميل لوحة الجوال.");
      setDashboardData(null);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <AdminMobileDashboard
      employeeName={user?.name ?? "مدير"}
      profileImageUrl={null}
      role={user?.role}
      dashboardData={dashboardData}
      isLoading={isLoading}
      error={error}
    />
  );
}
