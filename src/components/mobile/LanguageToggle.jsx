import { useTranslation } from "react-i18next";
import i18n from "../../i18n/index.js";

export default function LanguageToggle() {
  const { t } = useTranslation();
  const current = i18n.language?.startsWith("en") ? "en" : "ar";

  return (
    <div
      className="md-theme-segment w-full"
      role="group"
      aria-label={t("settings.general.languageLabel")}
    >
      <button
        type="button"
        onClick={() => i18n.changeLanguage("ar")}
        className={`md-theme-segment-btn flex-1 justify-center ${
          current === "ar" ? "md-theme-segment-btn-active" : ""
        }`}
        aria-pressed={current === "ar"}
      >
        {t("common.languageArabic")}
      </button>
      <button
        type="button"
        onClick={() => i18n.changeLanguage("en")}
        className={`md-theme-segment-btn flex-1 justify-center ${
          current === "en" ? "md-theme-segment-btn-active" : ""
        }`}
        aria-pressed={current === "en"}
      >
        {t("common.languageEnglish")}
      </button>
    </div>
  );
}
