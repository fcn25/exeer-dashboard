import { Navigate, Route, Routes } from "react-router-dom";
import AuthContainer from "./AuthContainer.jsx";
import ManagerLayout from "./layouts/ManagerLayout.jsx";
import HomePage from "./pages/HomePage.jsx";
import TasksPage from "./pages/TasksPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import PermissionsPage from "./pages/PermissionsPage.jsx";
import UnauthorizedPage from "./pages/UnauthorizedPage.jsx";
import EmployeePortalPage from "./pages/EmployeePortalPage.jsx";
import EmployeesPage from "./EmployeesPage.jsx";
import EventsPage from "./EventsPage.jsx";
import PerformancePage from "./pages/PerformancePage.jsx";
import PayrollPage from "./PayrollPage.jsx";
import SubscriptionPage from "./pages/SubscriptionPage.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

function LoginPage() {
  const { isAuthenticated, isBootstrapping, homePath } = useAuth();

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

  if (isAuthenticated) {
    return <Navigate to={homePath} replace />;
  }

  return <AuthContainer />;
}

function RootRedirect() {
  const { homePath } = useAuth();
  return <Navigate to={homePath} replace />;
}

function DashboardRoutes() {
  return (
    <ProtectedRoute allowDashboard>
      <Routes>
        <Route element={<ManagerLayout />}>
          <Route index element={<HomePage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route
            path="employees"
            element={
              <ProtectedRoute
                allowDashboard
                requiredPermission="can_edit_employees"
              >
                <EmployeesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="events"
            element={
              <ProtectedRoute
                allowDashboard
                requiredPermission="can_manage_events"
              >
                <EventsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="payroll"
            element={
              <ProtectedRoute allowDashboard requiredRole="owner">
                <PayrollPage />
              </ProtectedRoute>
            }
          />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route
            path="subscription"
            element={
              <ProtectedRoute allowDashboard requiredRole="owner">
                <SubscriptionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="permissions"
            element={
              <ProtectedRoute allowDashboard requiredRole="owner">
                <PermissionsPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </ProtectedRoute>
  );
}

function AppRoutes() {
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

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/unauthorized"
        element={
          isAuthenticated ? (
            <UnauthorizedPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RootRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/performance"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard/performance" replace />
          </ProtectedRoute>
        }
      />
      <Route path="/dashboard/*" element={<DashboardRoutes />} />
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
          <ProtectedRoute allowPortal>
            <EmployeePortalPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <Navigate to={homePath} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
