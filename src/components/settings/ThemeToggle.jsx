import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../providers/ThemeProvider.jsx";

export default function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="md-theme-segment" role="group" aria-label={t("settings.appearance.themeLabel")}>
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`md-theme-segment-btn ${
          theme === "light" ? "md-theme-segment-btn-active" : ""
        }`}
        aria-pressed={theme === "light"}
      >
        <Sun className="h-4 w-4 stroke-[1.75]" aria-hidden />
        {t("settings.appearance.light")}
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`md-theme-segment-btn ${
          theme === "dark" ? "md-theme-segment-btn-active" : ""
        }`}
        aria-pressed={theme === "dark"}
      >
        <Moon className="h-4 w-4 stroke-[1.75]" aria-hidden />
        {t("settings.appearance.dark")}
      </button>
    </div>
  );
}
