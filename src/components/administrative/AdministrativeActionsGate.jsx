import { Navigate } from "react-router-dom";
import { canManageAdministrativeActions } from "../../utils/rbac.js";

export function AdministrativeActionsGate({ children }) {
  if (!canManageAdministrativeActions()) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}
