import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_INDUSTRY,
  INDUSTRY_OPTIONS,
} from "../../constants/companyProfile.js";
import {
  getCompanyProfile,
  updateCompanyIndustry,
} from "../../services/companyService.js";
import CompanyWpsBankSection from "./CompanyWpsBankSection.jsx";
import { isOwner } from "../../utils/rbac.js";


export default function GeneralSettingsTab() {
  const { t, i18n } = useTranslation();
  const showWpsBankSettings = isOwner();
  const [industry, setIndustry] = useState(DEFAULT_INDUSTRY);
  const [isIndustryLoading, setIsIndustryLoading] = useState(true);
  const [isIndustrySaving, setIsIndustrySaving] = useState(false);
  const [industryError, setIndustryError] = useState("");
  const [industrySuccess, setIndustrySuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadIndustry() {
      setIsIndustryLoading(true);
      setIndustryError("");

      try {
        const profile = await getCompanyProfile();
        if (!cancelled) setIndustry(profile.industry || DEFAULT_INDUSTRY);
      } catch (err) {
        if (!cancelled) {
          setIndustryError(err.message || "تعذّر تحميل قطاع المنشأة.");
        }
      } finally {
        if (!cancelled) setIsIndustryLoading(false);
      }
    }

    loadIndustry();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!industrySuccess) return undefined;
    const timer = setTimeout(() => setIndustrySuccess(""), 3000);
    return () => clearTimeout(timer);
  }, [industrySuccess]);

  const handleIndustryChange = async (event) => {
    const nextIndustry = event.target.value;
    setIndustry(nextIndustry);
    setIsIndustrySaving(true);
    setIndustryError("");
    setIndustrySuccess("");

    try {
      await updateCompanyIndustry(nextIndustry);
      setIndustrySuccess("تم تحديث قطاع المنشأة");
    } catch (err) {
      setIndustryError(err.message || "تعذّر حفظ قطاع المنشأة.");
    } finally {
      setIsIndustrySaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-bold text-exeer-primary">
          {t("settings.general.title")}
        </h2>
        <p className="text-sm text-exeer-muted">
          {t("settings.general.description")}
        </p>
      </header>

      <div className="md-surface-muted max-w-md space-y-3 p-5">
        <label htmlFor="settings-language" className="md-label block">
          {t("settings.general.languageLabel")}
        </label>
        <select
          id="settings-language"
          value={i18n.language?.startsWith("en") ? "en" : "ar"}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="md-input"
        >
          <option value="ar">{t("common.languageArabic")}</option>
          <option value="en">{t("common.languageEnglish")}</option>
        </select>
        <p className="text-xs leading-relaxed text-exeer-muted">
          {t("settings.general.languageHint")}
        </p>
      </div>

      <div className="md-surface-muted max-w-md space-y-3 p-5">
        <label htmlFor="settings-industry" className="md-label block">
          {t("settings.general.industryLabel")}
        </label>
        <select
          id="settings-industry"
          value={industry}
          onChange={handleIndustryChange}
          disabled={isIndustryLoading || isIndustrySaving}
          className="md-input"
        >
          {INDUSTRY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs leading-relaxed text-exeer-muted">
          {t("settings.general.industryHint")}
        </p>
        {isIndustrySaving ? (
          <p className="text-xs text-exeer-muted">جاري الحفظ...</p>
        ) : null}
        {industrySuccess ? (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {industrySuccess}
          </p>
        ) : null}
        {industryError ? (
          <p className="text-xs text-red-700 dark:text-red-300">{industryError}</p>
        ) : null}
      </div>

      {showWpsBankSettings ? <CompanyWpsBankSection /> : null}
    </div>
  );
}
