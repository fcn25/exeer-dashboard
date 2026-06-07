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

const CompanySettingsContext = createContext(null);

const DEFAULTS_MAP = new Map(
  DEFAULT_COMPANY_SETTINGS.map((row) => [row.key, row.value]),
);

export function CompanySettingsProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [settings, setSettings] = useState(() => new Map(DEFAULTS_MAP));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSettings = useCallback(async () => {
    if (!isAuthenticated || !user?.company_id) {
      setSettings(new Map(DEFAULTS_MAP));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const map = await ensureDefaultCompanySettings(
        user.company_id,
        user.employee_id,
      );
      setSettings(map);
    } catch (err) {
      console.error("Company settings load failed:", err);
      setError(err.message || "تعذّر تحميل إعدادات النظام.");
      try {
        const fallback = await fetchCompanySettings(user.company_id);
        setSettings(fallback);
      } catch {
        setSettings(new Map(DEFAULTS_MAP));
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.company_id, user?.employee_id]);

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
        companyId: user?.company_id,
        employeeId: user?.employee_id,
      });

      setSettings((prev) => {
        const next = new Map(prev);
        for (const [key, value] of Object.entries(changes)) {
          next.set(key, value);
        }
        return next;
      });
    },
    [user?.company_id, user?.employee_id],
  );

  const value = useMemo(
    () => ({
      settings,
      isLoading,
      error,
      getSetting,
      saveSettings,
      refreshSettings: loadSettings,
    }),
    [settings, isLoading, error, getSetting, saveSettings, loadSettings],
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
