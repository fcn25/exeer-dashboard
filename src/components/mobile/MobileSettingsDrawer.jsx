import { LogOut, User, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../settings/ThemeToggle.jsx";
import LanguageToggle from "./LanguageToggle.jsx";
import { signOut } from "../../utils/mobileAuth.js";

function ProfileAvatar({ name, imageUrl }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-20 w-20 rounded-full object-cover ring-2 ring-exeer-border"
      />
    );
  }

  const initial = String(name ?? "؟").trim().charAt(0) || "؟";

  return (
    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-md-primary-container text-2xl font-bold text-md-on-primary-container dark:bg-[#1e3a5f] dark:text-[#e2e8f0]">
      {initial !== "؟" ? initial : <User className="h-9 w-9 stroke-[1.5]" aria-hidden />}
    </span>
  );
}

export default function MobileSettingsDrawer({
  isOpen,
  onClose,
  fullName,
  imageUrl,
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dir = i18n.language?.startsWith("en") ? "ltr" : "rtl";

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/35 backdrop-blur-[2px]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="إغلاق"
        onClick={onClose}
      />

      <aside
        dir={dir}
        lang={i18n.language?.startsWith("en") ? "en" : "ar"}
        className="relative flex h-full w-full max-w-[480px] flex-col bg-md-surface shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-settings-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-exeer-border px-5 py-4">
          <div className="space-y-1">
            <h2 id="mobile-settings-title" className="text-lg font-bold text-exeer-primary">
              {t("settings.title")}
            </h2>
            <p className="text-xs text-exeer-muted">{t("settings.general.description")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="flex flex-col items-center gap-3 pb-8 text-center">
            <ProfileAvatar name={fullName} imageUrl={imageUrl} />
            <div className="space-y-1">
              <p className="text-lg font-bold text-exeer-primary">{fullName}</p>
              <p className="text-xs text-exeer-muted">ملف شخصي — للعرض فقط</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="md-surface-muted space-y-3 rounded-2xl p-4">
              <p className="md-label">{t("settings.general.languageLabel")}</p>
              <LanguageToggle />
            </div>

            <div className="md-surface-muted space-y-3 rounded-2xl p-4">
              <p className="md-label">{t("settings.appearance.themeLabel")}</p>
              <ThemeToggle />
            </div>
          </div>
        </div>

        <div className="border-t border-exeer-border px-5 py-4">
          <button
            type="button"
            onClick={handleSignOut}
            className="md-btn-tonal inline-flex w-full items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </div>
  );
}
