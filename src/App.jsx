import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import AuthContainer from "./AuthContainer.jsx";
import ManagerLayout from "./layouts/ManagerLayout.jsx";
import HomePage from "./pages/HomePage.jsx";
import TasksPage from "./pages/TasksPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import PermissionsPage from "./pages/PermissionsPage.jsx";
import EmployeePortalPage from "./pages/EmployeePortalPage.jsx";
import EmployeesPage from "./EmployeesPage.jsx";
import EventsPage from "./EventsPage.jsx";
import MobileDashboard from "./MobileDashboard.jsx";
import PerformancePage from "./pages/PerformancePage.jsx";
import PayrollPage from "./PayrollPage.jsx";
import { ProtectedRoute } from "./components/routing/ProtectedRoute.jsx";
import { AuthProvider, useAuth } from "./providers/AuthProvider.jsx";
import { canAccessPerformance, canViewPayroll } from "./utils/rbac.js";

function RootRedirect() {
  const { homePath } = useAuth();
  return <Navigate to={homePath} replace />;
}

function PayrollRoute() {
  const { homePath } = useAuth();
  if (!canViewPayroll()) {
    return <Navigate to={homePath} replace />;
  }
  return <PayrollPage />;
}

function SettingsRoute() {
  const { homePath, role, isAdmin } = useAuth();
  const allowed =
    isAdmin || role === "Executive" || role === "HR_Manager";
  if (!allowed) {
    return <Navigate to={homePath} replace />;
  }
  return <SettingsPage />;
}

function PerformanceRoute() {
  const { homePath } = useAuth();
  if (!canAccessPerformance()) {
    return <Navigate to={homePath} replace />;
  }
  return <PerformancePage />;
}

function MobileRedirectWrapper() {
  const navigate = useNavigate();
  const { isDashboardUser } = useAuth();

  useEffect(() => {
    if (!isDashboardUser) return undefined;

    const redirectIfMobile = () => {
      if (window.innerWidth < 768) {
        navigate("/mobile", { replace: true });
      }
    };

    redirectIfMobile();
    window.addEventListener("resize", redirectIfMobile);
    return () => window.removeEventListener("resize", redirectIfMobile);
  }, [isDashboardUser, navigate]);

  return (
    <ProtectedRoute allowDashboard>
      <Routes>
        <Route element={<ManagerLayout />}>
          <Route index element={<HomePage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="payroll" element={<PayrollRoute />} />
          <Route path="performance" element={<PerformanceRoute />} />
          <Route path="settings" element={<SettingsRoute />} />
          <Route
            path="permissions"
            element={
              <ProtectedRoute adminOnly>
                <PermissionsPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </ProtectedRoute>
  );
}

function AuthenticatedRoutes() {
  const { isBootstrapping, isAuthenticated, homePath } = useAuth();

  if (isBootstrapping) {
    return (
      <div
        dir="rtl"
        lang="ar"
        className="flex min-h-screen items-center justify-center bg-md-surface-dim text-sm text-exeer-muted"
      >
        جاري التحميل...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthContainer />;
  }

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/performance" element={<Navigate to="/dashboard/performance" replace />} />
      <Route path="/dashboard/*" element={<MobileRedirectWrapper />} />
      <Route
        path="/employee-portal"
        element={
          <ProtectedRoute allowPortal>
            <EmployeePortalPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mobile"
        element={
          <ProtectedRoute allowDashboard>
            <MobileDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={homePath} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedRoutes />
    </AuthProvider>
  );
}
