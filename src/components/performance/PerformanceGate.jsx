import { Navigate } from "react-router-dom";
import { canAccessPerformance } from "../../utils/rbac.js";

export function PerformanceGate({ children }) {
  if (!canAccessPerformance()) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}
