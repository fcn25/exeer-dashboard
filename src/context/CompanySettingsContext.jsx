import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_COMPANY_SETTINGS } from "../constants/companySettingsDefaults.js";
import {
  ensureDefaultCompanySettings,
  fetchCompanySettings,
  upsertCompanySettings,
} from "../services/companySettingsService.js";
import { useAuth } from "./AuthContext.jsx";
import { useCurrentEmployee } from "./CurrentEmployeeContext.jsx";

const CompanySettingsContext = createContext(null);

const DEFAULTS_MAP = new Map(
  DEFAULT_COMPANY_SETTINGS.map((row) => [row.key, row.value]),
);

export function CompanySettingsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { companyId, employeeId, isLoading: employeeLoading } = useCurrentEmployee();
  const [settings, setSettings] = useState(() => new Map(DEFAULTS_MAP));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSettings = useCallback(async () => {
    if (!isAuthenticated || !companyId) {
      setSettings(new Map(DEFAULTS_MAP));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const map = await ensureDefaultCompanySettings(companyId, employeeId);
      setSettings(map);
    } catch (err) {
      console.error("Company settings load failed:", err);
      setError(err.message || "تعذّر تحميل إعدادات النظام.");
      try {
        const fallback = await fetchCompanySettings(companyId);
        setSettings(fallback);
      } catch {
        setSettings(new Map(DEFAULTS_MAP));
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, companyId, employeeId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const getSetting = useCallback(
    (key, fallback = DEFAULTS_MAP.get(key)) => {
      if (settings.has(key)) return settings.get(key);
      return fallback;
    },
    [settings],
  );

  const saveSettings = useCallback(
    async (changes) => {
      await upsertCompanySettings(changes, {
        companyId,
        employeeId,
      });

      setSettings((prev) => {
        const next = new Map(prev);
        for (const [key, value] of Object.entries(changes)) {
          next.set(key, value);
        }
        return next;
      });
    },
    [companyId, employeeId],
  );

  const value = useMemo(
    () => ({
      settings,
      isLoading: isLoading || employeeLoading,
      error,
      getSetting,
      saveSettings,
      refreshSettings: loadSettings,
    }),
    [settings, isLoading, employeeLoading, error, getSetting, saveSettings, loadSettings],
  );

  return (
    <CompanySettingsContext.Provider value={value}>
      {children}
    </CompanySettingsContext.Provider>
  );
}

export function useCompanySettings() {
  const context = useContext(CompanySettingsContext);
  if (!context) {
    throw new Error(
      "useCompanySettings must be used within CompanySettingsProvider",
    );
  }
  return context;
}
