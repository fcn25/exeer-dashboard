import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider.jsx";

export function ProtectedRoute({
  children,
  allowDashboard = false,
  allowPortal = false,
  adminOnly = false,
}) {
  const { isAdmin, isDashboardUser, homePath, isMobile } = useAuth();
  const location = useLocation();

  if (adminOnly && !isAdmin) {
    return <Navigate to={homePath} replace state={{ from: location }} />;
  }

  if (allowDashboard && isMobile) {
    return <Navigate to="/mobile" replace state={{ from: location }} />;
  }

  if (allowDashboard && !isDashboardUser) {
    return <Navigate to="/employee-portal" replace state={{ from: location }} />;
  }

  if (allowPortal && isDashboardUser && !isMobile) {
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }

  return children;
}

export function PermissionGate({ permission, children, fallback = null }) {
  const { permissions, isAdmin } = useAuth();
  const allowed = isAdmin || Boolean(permissions?.[permission]);
  if (!allowed) return fallback;
  return children;
}
