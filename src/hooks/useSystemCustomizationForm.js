import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_COMPANY_SETTINGS } from "../constants/companySettingsDefaults.js";
import { SYSTEM_CUSTOMIZATION_TAB_KEYS } from "../components/settings/system/systemCustomizationConfig.js";
import { useCompanySettings } from "../context/CompanySettingsContext.jsx";

function buildDraftFromSettings(getSetting) {
  const draft = {};
  for (const row of DEFAULT_COMPANY_SETTINGS) {
    draft[row.key] = getSetting(row.key, row.value);
  }
  return draft;
}

function pickChanges(draft, baseline, keys) {
  const changes = {};
  for (const key of keys) {
    if (draft[key] !== baseline[key]) {
      changes[key] = draft[key];
    }
  }
  return changes;
}

export function useSystemCustomizationForm() {
  const { t } = useTranslation();
  const { getSetting, saveSettings, isLoading } = useCompanySettings();

  const [activeTab, setActiveTab] = useState("hr");
  const [baseline, setBaseline] = useState(() =>
    buildDraftFromSettings(() => null),
  );
  const [draft, setDraft] = useState(() => buildDraftFromSettings(() => null));
  const [savingTab, setSavingTab] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [errorToast, setErrorToast] = useState("");

  const syncFromContext = useCallback(() => {
    const next = buildDraftFromSettings(getSetting);
    setBaseline(next);
    setDraft(next);
  }, [getSetting]);

  useEffect(() => {
    if (!isLoading) syncFromContext();
  }, [isLoading, syncFromContext]);

  const updateDraft = useCallback((key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const tabDirty = useMemo(() => {
    const keys = SYSTEM_CUSTOMIZATION_TAB_KEYS[activeTab] ?? [];
    return keys.some((key) => draft[key] !== baseline[key]);
  }, [activeTab, draft, baseline]);

  const handleSaveTab = useCallback(async () => {
    const keys = SYSTEM_CUSTOMIZATION_TAB_KEYS[activeTab] ?? [];
    const changes = pickChanges(draft, baseline, keys);
    if (!Object.keys(changes).length) return;

    setSavingTab(activeTab);
    setErrorToast("");

    try {
      await saveSettings(changes);
      setBaseline((prev) => ({ ...prev, ...changes }));
      setSuccessToast(t("systemCustomization.saveSuccess"));
    } catch (err) {
      setErrorToast(err.message || t("systemCustomization.saveError"));
    } finally {
      setSavingTab("");
    }
  }, [activeTab, baseline, draft, saveSettings, t]);

  return {
    activeTab,
    setActiveTab,
    draft,
    updateDraft,
    tabDirty,
    savingTab,
    successToast,
    errorToast,
    setSuccessToast,
    setErrorToast,
    handleSaveTab,
    isLoading,
  };
}
