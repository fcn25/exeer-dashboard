import { useTranslation } from "react-i18next";
import ThemeToggle from "./ThemeToggle.jsx";

export default function AppearanceSettingsTab() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-bold text-exeer-primary">
          {t("settings.appearance.title")}
        </h2>
        <p className="text-sm text-exeer-muted">
          {t("settings.appearance.description")}
        </p>
      </header>

      <div className="md-surface-muted max-w-lg space-y-4 p-5">
        <p className="md-label">{t("settings.appearance.themeLabel")}</p>
        <ThemeToggle />
      </div>

      <div className="md-surface max-w-lg space-y-2 p-5">
        <p className="text-sm font-semibold text-exeer-primary">
          {t("settings.appearance.previewTitle")}
        </p>
        <p className="text-sm leading-relaxed text-exeer-muted">
          {t("settings.appearance.previewBody")}
        </p>
        <div className="mt-4 flex gap-3">
          <span className="h-10 w-10 rounded-xl bg-[#0f172a] ring-2 ring-exeer-border" title="#0f172a" />
          <span className="h-10 w-10 rounded-xl bg-[#1e293b] ring-2 ring-exeer-border" title="#1e293b" />
          <span className="h-10 w-10 rounded-xl bg-[#334155] ring-2 ring-exeer-border" title="#334155" />
          <span className="h-10 w-10 rounded-xl bg-[#93b4e8] ring-2 ring-exeer-border" title="#93b4e8" />
        </div>
      </div>
    </div>
  );
}
