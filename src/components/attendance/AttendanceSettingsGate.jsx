import { Navigate } from "react-router-dom";
import { canManageAttendanceSettings } from "../../utils/rbac.js";

export function AttendanceSettingsGate({ children }) {
  if (!canManageAttendanceSettings()) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}
