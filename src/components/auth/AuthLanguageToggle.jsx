import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n/index.js";

export default function AuthLanguageToggle() {
  const { t } = useTranslation();
  const current = i18n.language?.startsWith("en") ? "en" : "ar";

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm"
      role="group"
      aria-label={t("settings.general.languageLabel")}
    >
      <span className="hidden ps-2 text-slate-500 sm:inline-flex">
        <Languages className="h-4 w-4" aria-hidden />
      </span>
      <button
        type="button"
        onClick={() => i18n.changeLanguage("ar")}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
          current === "ar"
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:text-slate-900"
        }`}
        aria-pressed={current === "ar"}
      >
        {t("common.languageArabic")}
      </button>
      <button
        type="button"
        onClick={() => i18n.changeLanguage("en")}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
          current === "en"
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:text-slate-900"
        }`}
        aria-pressed={current === "en"}
      >
        {t("common.languageEnglish")}
      </button>
    </div>
  );
}
