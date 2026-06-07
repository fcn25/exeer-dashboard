import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearCurrentEmployeeCache,
  fetchCurrentEmployee,
} from "../services/currentEmployeeService.js";
import { persistAuthSession } from "../utils/mobileAuth.js";
import { useAuth } from "./AuthContext.jsx";

const CurrentEmployeeContext = createContext(null);

function syncEmployeeToAuthStorage(current, authUser) {
  if (!current || !authUser) return;

  persistAuthSession(null, {
    id: authUser.id,
    email: authUser.email ?? current.email,
    name: current.fullName ?? authUser.name,
    role: current.role,
    company_id: current.companyId,
    employee_id: current.employeeId,
    department: current.department,
    job_title: current.jobTitle,
    permissions: authUser.permissions,
  });
}

export function CurrentEmployeeProvider({ children }) {
  const { isAuthenticated, isBootstrapping, user } = useAuth();
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshCurrentEmployee = useCallback(async ({ force = false } = {}) => {
    if (!isAuthenticated) {
      clearCurrentEmployeeCache();
      setCurrentEmployee(null);
      setError("");
      return null;
    }

    setIsLoading(true);
    setError("");

    try {
      const resolved = await fetchCurrentEmployee({ force });
      setCurrentEmployee(resolved);
      syncEmployeeToAuthStorage(resolved, user);
      return resolved;
    } catch (err) {
      setError(err.message || "تعذّر تحميل بيانات الموظف.");
      setCurrentEmployee(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isBootstrapping) return;

    if (!isAuthenticated) {
      clearCurrentEmployeeCache();
      setCurrentEmployee(null);
      setError("");
      return;
    }

    refreshCurrentEmployee();
  }, [isAuthenticated, isBootstrapping, user?.id, refreshCurrentEmployee]);

  const value = useMemo(() => {
    const employeeId = currentEmployee?.employeeId ?? null;
    const companyId = currentEmployee?.companyId ?? null;
    const authUserId = currentEmployee?.authUserId ?? user?.id ?? null;
    const role = currentEmployee?.role ?? user?.role ?? null;

    return {
      employee: currentEmployee?.employee ?? null,
      employeeId,
      companyId,
      authUserId,
      role,
      fullName: currentEmployee?.fullName ?? user?.name ?? null,
      email: currentEmployee?.email ?? user?.email ?? null,
      department: currentEmployee?.department ?? user?.department ?? null,
      jobTitle: currentEmployee?.jobTitle ?? user?.job_title ?? null,
      isLoading: isBootstrapping || isLoading,
      error,
      isReady: Boolean(employeeId && companyId),
      refreshCurrentEmployee,
    };
  }, [
    currentEmployee,
    error,
    isBootstrapping,
    isLoading,
    refreshCurrentEmployee,
    user,
  ]);

  return (
    <CurrentEmployeeContext.Provider value={value}>
      {children}
    </CurrentEmployeeContext.Provider>
  );
}

export function useCurrentEmployee() {
  const context = useContext(CurrentEmployeeContext);
  if (!context) {
    throw new Error("useCurrentEmployee must be used within CurrentEmployeeProvider");
  }
  return context;
}

export { CurrentEmployeeContext };
