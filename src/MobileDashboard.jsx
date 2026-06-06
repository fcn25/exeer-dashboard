import AdminMobileDashboard from "./components/mobile/dashboard/AdminMobileDashboard.jsx";
import { getUserDisplay } from "./utils/mobileAuth.js";

/**
 * Legacy entry — delegates to the refactored admin mobile dashboard.
 */
export default function MobileDashboard() {
  const user = getUserDisplay();

  return (
    <AdminMobileDashboard
      employeeName={user?.name ?? "مدير"}
      profileImageUrl={user?.image ?? null}
      role={user?.role}
    />
  );
}
