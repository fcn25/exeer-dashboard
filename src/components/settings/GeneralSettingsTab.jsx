import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getCompanyProfile,
  updateCompanySector,
} from "../../services/companyService.js";
import {
  fetchCompanySettings,
  upsertCompanySettings,
} from "../../services/companySettingsService.js";
import { listSectors } from "../../services/sectorsService.js";
import CompanyWpsBankSection from "./CompanyWpsBankSection.jsx";
import { isOwner } from "../../utils/rbac.js";

export default function GeneralSettingsTab() {
  const { t, i18n } = useTranslation();
  const showWpsBankSettings = isOwner();
  const [sectors, setSectors] = useState([]);
  const [sectorId, setSectorId] = useState("");
  const [requiredGreen, setRequiredGreen] = useState("");
  const [requiredPlatinum, setRequiredPlatinum] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSector, setIsSavingSector] = useState(false);
  const [isSavingNitaqat, setIsSavingNitaqat] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const [profile, sectorRows, settings] = await Promise.all([
          getCompanyProfile(),
          listSectors(),
          fetchCompanySettings(),
        ]);

        if (cancelled) return;
        setSectors(sectorRows);
        setSectorId(profile.sector_id ? String(profile.sector_id) : "");
        setRequiredGreen(
          settings.get("nitaqat_required_green") != null
            ? String(settings.get("nitaqat_required_green"))
            : "",
        );
        setRequiredPlatinum(
          settings.get("nitaqat_required_platinum") != null
            ? String(settings.get("nitaqat_required_platinum"))
            : "",
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "تعذّر تحميل إعدادات المنشأة.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const handleSectorChange = async (event) => {
    const nextId = event.target.value;
    setSectorId(nextId);
    setIsSavingSector(true);
    setError("");
    setSuccess("");

    try {
      await updateCompanySector(nextId);
      setSuccess("تم تحديث قطاع المنشأة");
    } catch (err) {
      setError(err.message || "تعذّر حفظ قطاع المنشأة.");
    } finally {
      setIsSavingSector(false);
    }
  };

  const handleSaveNitaqatThresholds = async (event) => {
    event.preventDefault();
    setIsSavingNitaqat(true);
    setError("");
    setSuccess("");

    const greenValue = requiredGreen.trim();
    const platinumValue = requiredPlatinum.trim();

    try {
      await upsertCompanySettings({
        nitaqat_required_green: greenValue ? Number(greenValue) : null,
        nitaqat_required_platinum: platinumValue ? Number(platinumValue) : null,
      });
      setSuccess("تم حفظ نسب نطاقات المطلوبة");
    } catch (err) {
      setError(err.message || "تعذّر حفظ نسب نطاقات.");
    } finally {
      setIsSavingNitaqat(false);
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
        <label htmlFor="settings-sector" className="md-label block">
          {t("settings.general.industryLabel")}
        </label>
        <select
          id="settings-sector"
          value={sectorId}
          onChange={handleSectorChange}
          disabled={isLoading || isSavingSector}
          className="md-input"
        >
          <option value="">— اختر قطاع النشاط —</option>
          {sectors.map((sector) => (
            <option key={sector.id} value={String(sector.id)}>
              {sector.nameAr}
            </option>
          ))}
        </select>
        <p className="text-xs leading-relaxed text-exeer-muted">
          قطاع النشاط الاقتصادي حسب دليل نطاقات — يُستخدم في متتبّع السعودة.
        </p>
        {isSavingSector ? (
          <p className="text-xs text-exeer-muted">جاري الحفظ...</p>
        ) : null}
      </div>

      {showWpsBankSettings ? (
        <form
          onSubmit={handleSaveNitaqatThresholds}
          className="md-surface-muted max-w-md space-y-3 p-5"
        >
          <h3 className="text-sm font-semibold text-exeer-primary">
            نسب نطاقات المطلوبة (تقديري)
          </h3>
          <p className="text-xs leading-relaxed text-exeer-muted">
            أدخل النسب من{" "}
            <a
              href="https://nitaqat.mlsd.gov.sa"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              nitaqat.mlsd.gov.sa
            </a>{" "}
            حسب قطاعك وحجم منشأتك.
          </p>

          <label htmlFor="nitaqat-green" className="md-label block">
            الحد الأدنى للأخضر (%)
          </label>
          <input
            id="nitaqat-green"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={requiredGreen}
            onChange={(event) => setRequiredGreen(event.target.value)}
            className="md-input"
            placeholder="مثال: 25"
            disabled={isLoading}
          />

          <label htmlFor="nitaqat-platinum" className="md-label block">
            الحد الأدنى للبلاتيني (%)
          </label>
          <input
            id="nitaqat-platinum"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={requiredPlatinum}
            onChange={(event) => setRequiredPlatinum(event.target.value)}
            className="md-input"
            placeholder="اختياري"
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={isLoading || isSavingNitaqat}
            className="md-btn-primary"
          >
            {isSavingNitaqat ? "جاري الحفظ..." : "حفظ نسب نطاقات"}
          </button>
        </form>
      ) : null}

      {success ? (
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
      ) : null}

      {showWpsBankSettings ? <CompanyWpsBankSection /> : null}
    </div>
  );
}
