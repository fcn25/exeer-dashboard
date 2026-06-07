import { CreditCard, LogOut, SlidersHorizontal, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import EmployeeProfileSummary from "../employees/EmployeeProfileSummary.jsx";
import ThemeToggle from "../settings/ThemeToggle.jsx";
import LanguageToggle from "./LanguageToggle.jsx";
import MobileSubscriptionView from "./MobileSubscriptionView.jsx";
import { fetchEmployeeProfileById } from "../../services/employeeProfileService.js";
import { signOut } from "../../utils/mobileAuth.js";
import { isOwner } from "../../utils/rbac.js";

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
  employeeId,
  fullName,
  imageUrl,
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dir = i18n.language?.startsWith("en") ? "ltr" : "rtl";
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const owner = isOwner();

  useEffect(() => {
    if (!isOpen || !employeeId) {
      setProfile(null);
      setProfileError("");
      return undefined;
    }

    let cancelled = false;

    async function loadProfile() {
      setProfileLoading(true);
      setProfileError("");

      try {
        const row = await fetchEmployeeProfileById(employeeId);
        if (!cancelled) setProfile(row);
      } catch (err) {
        if (!cancelled) {
          setProfile(null);
          setProfileError(err.message || "تعذّر تحميل الملف الشخصي.");
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [isOpen, employeeId]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const openSubscription = () => {
    onClose();
    navigate("/mobile/subscription");
  };

  if (!isOpen) return null;

  return (
    <>
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
          className="relative flex h-full w-full max-w-[480px] flex-col border-s border-gray-200 bg-white"
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
              className="flex h-9 w-9 items-center justify-center rounded-md border border-exeer-border text-exeer-muted transition-colors hover:bg-exeer-hover"
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
              {employeeId ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-exeer-muted">
                    بيانات الموظف
                  </p>
                  {profileError ? (
                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                      {profileError}
                    </p>
                  ) : null}
                  <EmployeeProfileSummary
                    employee={profile}
                    isLoading={profileLoading}
                  />
                </div>
              ) : null}

              {owner ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate("/mobile/settings/system");
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-exeer-border bg-white px-4 py-3.5 text-sm font-semibold text-exeer-primary transition-colors hover:bg-exeer-hover"
                  >
                    <span className="inline-flex items-center gap-2">
                      <SlidersHorizontal className="h-5 w-5" aria-hidden />
                      {t("nav.systemCustomization")}
                    </span>
                  </button>

                  <div className="md-surface-muted rounded-md p-4">
                  <button
                    type="button"
                    onClick={openSubscription}
                    className="flex w-full items-center justify-between gap-3 rounded-md bg-md-primary px-4 py-3.5 text-sm font-semibold text-white dark:bg-slate-700"
                  >
                    <span className="inline-flex items-center gap-2">
                      <CreditCard className="h-5 w-5" aria-hidden />
                      {t("settings.tabs.subscription")}
                    </span>
                    <span className="text-xs opacity-90">ادفع الآن</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setIsSubscriptionOpen(true);
                    }}
                    className="mt-2 w-full text-center text-xs font-medium text-exeer-muted underline-offset-2 hover:underline"
                  >
                    عرض تفاصيل الاشتراك
                  </button>
                  </div>
                </div>
              ) : null}

              <div className="md-surface-muted space-y-3 rounded-md p-4">
                <p className="md-label">{t("settings.general.languageLabel")}</p>
                <LanguageToggle />
              </div>

              <div className="md-surface-muted space-y-3 rounded-md p-4">
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

      <MobileSubscriptionView
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
      />
    </>
  );
}
