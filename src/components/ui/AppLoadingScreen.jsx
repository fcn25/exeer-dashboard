import { useAppLocale } from "../../i18n/useAppLocale.js";

export default function AppLoadingScreen({ className = "" }) {
  const { t, dir, lang } = useAppLocale();

  return (
    <div
      dir={dir}
      lang={lang}
      className={`flex min-h-screen items-center justify-center bg-md-surface-dim text-sm text-exeer-muted ${className}`}
    >
      {t("app.loading")}
    </div>
  );
}
