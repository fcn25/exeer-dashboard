import { Link } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useAppLocale } from "../i18n/useAppLocale.js";

export default function UnauthorizedPage() {
  const { homePath } = useAuth();
  const { t, dir, lang } = useAppLocale();

  return (
    <div
      dir={dir}
      lang={lang}
      className="flex min-h-screen flex-col items-center justify-center bg-md-surface-dim px-6 text-center"
    >
      <div className="md-surface max-w-md space-y-6 p-8">
        <ShieldX
          className="mx-auto h-14 w-14 text-red-600 dark:text-red-400"
          aria-hidden
        />
        <h1 className="text-2xl font-bold text-exeer-primary">
          403 — {t("app.unauthorizedTitle")}
        </h1>
        <p className="text-sm leading-relaxed text-exeer-muted">
          {t("app.unauthorizedBody")}
        </p>
        <Link to={homePath} className="md-btn-primary inline-flex">
          {t("app.unauthorizedBack")}
        </Link>
      </div>
    </div>
  );
}
