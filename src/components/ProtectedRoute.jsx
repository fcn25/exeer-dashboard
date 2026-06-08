import { Navigate, useLocation } from "react-router-dom";
import AppLoadingScreen from "./ui/AppLoadingScreen.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { isAccountantRole, normalizeAppRole } from "../constants/roles.js";

function normalizeRequiredRoles(requiredRole) {
  if (!requiredRole) return [];
  if (Array.isArray(requiredRole)) {
    return requiredRole.map((role) => normalizeAppRole(role));
  }
  return [normalizeAppRole(requiredRole)];
}

function roleMatches(requiredRole, userRole) {
  const allowed = normalizeRequiredRoles(requiredRole);
  if (allowed.length === 0) return true;
  return allowed.includes(normalizeAppRole(userRole));
}

export function ProtectedRoute({
  children,
  allowDashboard = false,
  allowPortal = false,
  requiredRole = null,
  requiredPermission = null,
}) {
  const {
    isAuthenticated,
    isBootstrapping,
    role,
    permissions,
    isOwner,
    isDashboardUser,
    homePath,
    isMobile,
  } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <AppLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requiredRole && !roleMatches(requiredRole, role)) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />;
  }

  if (requiredPermission) {
    const allowed =
      isOwner ||
      Boolean(permissions?.[requiredPermission]) ||
      (requiredPermission === "can_view_payroll" && isAccountantRole(role));
    if (!allowed) {
      return <Navigate to="/unauthorized" replace state={{ from: location }} />;
    }
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

export function PermissionGate({
  permission,
  requiredRole = null,
  children,
  fallback = null,
}) {
  const { role, permissions, isOwner } = useAuth();

  if (requiredRole && !roleMatches(requiredRole, role)) {
    return fallback;
  }

  if (permission) {
    const allowed =
      isOwner ||
      Boolean(permissions?.[permission]) ||
      (permission === "can_view_payroll" && isAccountantRole(role));
    if (!allowed) return fallback;
  }

  return children;
}
