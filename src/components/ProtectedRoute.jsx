import { Navigate, useLocation } from "react-router-dom";
import AppLoadingScreen from "./ui/AppLoadingScreen.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { roleCanAccessNavKey, roleCanAccessPath } from "../constants/roleNav.js";
import { shouldBlockNativeAppAccess } from "../utils/authenticatedHomePath.js";

export function NavAccessGate({
  children,
  navKey,
  altNavKeys = [],
  fallback = <Navigate to="/unauthorized" replace />,
}) {
  const { role } = useAuth();

  if (!roleCanAccessNavKey(role, navKey, altNavKeys)) {
    return fallback;
  }

  return children;
}

export function ProtectedRoute({
  children,
  allowDashboard = false,
  allowPortal = false,
  requiredNavKey = null,
  altNavKeys = [],
  enforceRoleNav = false,
}) {
  const { isAuthenticated, isBootstrapping, role, isMobile } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <AppLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (shouldBlockNativeAppAccess(location.pathname, role)) {
    return <Navigate to="/mobile/access-denied" replace />;
  }

  if (requiredNavKey && !roleCanAccessNavKey(role, requiredNavKey, altNavKeys)) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />;
  }

  if (enforceRoleNav && !roleCanAccessPath(role, location.pathname)) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />;
  }

  if (allowDashboard && isMobile) {
    return <Navigate to="/mobile" replace state={{ from: location }} />;
  }

  if (allowDashboard && location.pathname.startsWith("/dashboard")) {
    if (!roleCanAccessPath(role, location.pathname)) {
      return <Navigate to="/unauthorized" replace state={{ from: location }} />;
    }
  }

  if (allowPortal && !roleCanAccessPath(role, location.pathname)) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />;
  }

  return children;
}

export function PermissionGate({ navKey, altNavKeys = [], children, fallback = null }) {
  const { role } = useAuth();

  if (!roleCanAccessNavKey(role, navKey, altNavKeys)) {
    return fallback;
  }

  return children;
}
