import { Navigate, Route, Routes } from "react-router-dom";
import { isAccountantRole } from "./constants/roles.js";
import AuthContainer from "./AuthContainer.jsx";
import ManagerLayout from "./layouts/ManagerLayout.jsx";
import HomePage from "./pages/HomePage.jsx";
import TasksPage from "./pages/TasksPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import SystemCustomizationPage from "./pages/SystemCustomizationPage.jsx";
import { SystemCustomizationGate } from "./components/settings/SystemCustomizationGate.jsx";
import { CompanySettingsProvider } from "./context/CompanySettingsContext.jsx";
import PermissionsPage from "./pages/PermissionsPage.jsx";
import UnauthorizedPage from "./pages/UnauthorizedPage.jsx";
import EmployeePortalPage from "./pages/EmployeePortalPage.jsx";
import EmployeesPage from "./EmployeesPage.jsx";
import EventsPage from "./EventsPage.jsx";
import PerformancePage from "./pages/PerformancePage.jsx";
import PayrollPage from "./PayrollPage.jsx";
import AttendancePage from "./pages/AttendancePage.jsx";
import AttendanceSettingsPage from "./pages/AttendanceSettingsPage.jsx";
import { AttendanceSettingsGate } from "./components/attendance/AttendanceSettingsGate.jsx";
import AdministrativeActionsPage from "./pages/AdministrativeActionsPage.jsx";
import MyTeamDashboard from "./pages/MyTeamDashboard.jsx";
import MobileAdministrativeActionsPage from "./pages/mobile/MobileAdministrativeActionsPage.jsx";
import MobileTrainingPage from "./pages/mobile/MobileTrainingPage.jsx";
import MobileAttendancePage from "./pages/mobile/MobileAttendancePage.jsx";
import MobileAttendanceSettingsPage from "./pages/mobile/MobileAttendanceSettingsPage.jsx";
import MobileSystemCustomizationPage from "./pages/mobile/MobileSystemCustomizationPage.jsx";
import MobileNativeAccessDeniedPage from "./pages/mobile/MobileNativeAccessDeniedPage.jsx";
import { AdministrativeActionsGate } from "./components/administrative/AdministrativeActionsGate.jsx";
import UpdatePasswordPage from "./pages/UpdatePasswordPage.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import AppLoadingScreen from "./components/ui/AppLoadingScreen.jsx";
import SentryErrorFallback from "./components/ui/SentryErrorFallback.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { CurrentEmployeeProvider } from "./context/CurrentEmployeeContext.jsx";
import MobileOrientationController from "./components/mobile/MobileOrientationController.jsx";

// 💡 إضافة Sentry هنا
import * as SentryReact from "@sentry/react";

function MobileRoute({ children }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function LoginPage() {
  const { isAuthenticated, isBootstrapping, homePath } = useAuth();

  if (isBootstrapping) {
    return <AppLoadingScreen />;
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
  const { role } = useAuth();

  if (isAccountantRole(role)) {
    return (
      <Routes>
        <Route
          path="payroll"
          element={
            <ProtectedRoute requiredPermission="can_view_payroll">
              <PayrollPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/employee-portal" replace />} />
      </Routes>
    );
  }

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
              <ProtectedRoute
                allowDashboard
                requiredPermission="can_view_payroll"
              >
                <PayrollPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="attendance/settings"
            element={
              <ProtectedRoute allowDashboard>
                <AttendanceSettingsGate>
                  <AttendanceSettingsPage />
                </AttendanceSettingsGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="attendance/branches"
            element={
              <Navigate to="/dashboard/attendance/settings" replace />
            }
          />
          <Route
            path="attendance"
            element={
              <ProtectedRoute
                allowDashboard
                requiredPermission="can_view_payroll"
              >
                <AttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="administrative-actions"
            element={
              <AdministrativeActionsGate>
                <AdministrativeActionsPage />
              </AdministrativeActionsGate>
            }
          />
          <Route path="performance" element={<PerformancePage />} />
          <Route
            path="my-team"
            element={
              <ProtectedRoute
                allowDashboard
                requiredRole={[
                  "owner",
                  "Executive",
                  "HR_Manager",
                  "HR_Assistant",
                  "Direct_Manager",
                ]}
              >
                <MyTeamDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="settings" element={<SettingsPage />} />
          <Route
            path="settings/system"
            element={
              <SystemCustomizationGate>
                <SystemCustomizationPage />
              </SystemCustomizationGate>
            }
          />
          <Route
            path="subscription"
            element={
              <Navigate to="/dashboard/settings?tab=subscription" replace />
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
    return <AppLoadingScreen />;
  }

  return (
    <>
      <MobileOrientationController />
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/update-password" element={<UpdatePasswordPage />} />
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
        path="/mobile/access-denied"
        element={
          <ProtectedRoute>
            <MobileRoute>
              <MobileNativeAccessDeniedPage />
            </MobileRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mobile/subscription"
        element={<Navigate to="/mobile" replace />}
      />
      <Route
        path="/mobile"
        element={
          <ProtectedRoute allowPortal>
            <MobileRoute>
              <EmployeePortalPage />
            </MobileRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mobile/administrative-actions"
        element={
          <ProtectedRoute allowPortal>
            <AdministrativeActionsGate>
              <MobileRoute>
                <MobileAdministrativeActionsPage />
              </MobileRoute>
            </AdministrativeActionsGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mobile/performance"
        element={<Navigate to="/mobile" replace />}
      />
      <Route
        path="/mobile/recognition"
        element={<Navigate to="/mobile" replace />}
      />
      <Route
        path="/mobile/training"
        element={
          <ProtectedRoute allowPortal>
            <MobileRoute>
              <MobileTrainingPage />
            </MobileRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mobile/attendance"
        element={
          <ProtectedRoute allowPortal>
            <MobileRoute>
              <MobileAttendancePage />
            </MobileRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mobile/attendance/settings"
        element={
          <ProtectedRoute allowPortal>
            <AttendanceSettingsGate>
              <MobileRoute>
                <MobileAttendanceSettingsPage />
              </MobileRoute>
            </AttendanceSettingsGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mobile/settings/system"
        element={
          <ProtectedRoute allowPortal>
            <SystemCustomizationGate>
              <MobileRoute>
                <MobileSystemCustomizationPage />
              </MobileRoute>
            </SystemCustomizationGate>
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
    </>
  );
}

export default function App() {
  return (
    // 💡 تغليف التطبيق بالكامل بجدار حماية Sentry هنا
    <SentryReact.ErrorBoundary fallback={<SentryErrorFallback />}>
      {/* 💡 هذا كودك الأصلي تماماً بداخل الغلاف */}
      <AuthProvider>
        <CurrentEmployeeProvider>
          <CompanySettingsProvider>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </CompanySettingsProvider>
        </CurrentEmployeeProvider>
      </AuthProvider>
    </SentryReact.ErrorBoundary>
  );
}