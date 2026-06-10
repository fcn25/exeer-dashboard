import { Link } from "react-router-dom";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import SuccessToast from "../../components/ui/SuccessToast.jsx";
import ErrorToast from "../../components/ui/ErrorToast.jsx";
import { TabSaveButton } from "../../components/settings/system/SettingControls.jsx";
import SystemCustomizationPanels from "../../components/settings/system/SystemCustomizationPanels.jsx";
import { SYSTEM_CUSTOMIZATION_TABS } from "../../components/settings/system/systemCustomizationConfig.js";
import { useSystemCustomizationForm } from "../../hooks/useSystemCustomizationForm.js";

export default function MobileSystemCustomizationPage() {
  const { t, i18n } = useTranslation();
  const pageDir = i18n.language?.startsWith("en") ? "ltr" : "rtl";
  const pageLang = i18n.language?.startsWith("en") ? "en" : "ar";

  const {
    activeTab,
    setActiveTab,
    draft,
    updateDraft,
    tabDirty,
    savingTab,
    successToast,
    errorToast,
    setSuccessToast,
    setErrorToast,
    handleSaveTab,
    isLoading,
  } = useSystemCustomizationForm();

  return (
    <div
      dir={pageDir}
      lang={pageLang}
      className="mx-auto min-h-screen w-full max-w-[480px] bg-gray-50/80 pb-10 font-sans text-exeer-primary"
    >
      <header className="native-mobile-app-bar sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            to="/mobile"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-100 bg-white text-exeer-primary shadow-sm transition-colors hover:bg-gray-50"
            aria-label={t("common.back")}
          >
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <SlidersHorizontal
                className="h-4 w-4 shrink-0 text-exeer-primary"
                aria-hidden
              />
              <h1 className="truncate text-base font-bold">
                {t("systemCustomization.title")}
              </h1>
            </div>
            <p className="text-[11px] text-exeer-muted">
              {t("systemCustomization.subtitle")}
            </p>
          </div>
        </div>
      </header>

      <main className="space-y-4 px-4 py-4">
        <nav
          className="flex gap-1 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm"
          aria-label={t("systemCustomization.title")}
        >
          {SYSTEM_CUSTOMIZATION_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-md-primary text-white dark:bg-slate-700"
                    : "text-exeer-muted hover:bg-gray-50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {t(`systemCustomization.tabs.${tab.id}`)}
              </button>
            );
          })}
        </nav>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          {isLoading ? (
            <p className="text-sm text-exeer-muted">{t("common.loading")}</p>
          ) : (
            <>
              <SystemCustomizationPanels
                activeTab={activeTab}
                draft={draft}
                updateDraft={updateDraft}
                fullWidth
              />

              <div className="mt-6 border-t border-exeer-border pt-4">
                <TabSaveButton
                  className="w-full"
                  onClick={handleSaveTab}
                  isSaving={savingTab === activeTab}
                  disabled={!tabDirty}
                />
              </div>
            </>
          )}
        </section>
      </main>

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
      <ErrorToast message={errorToast} onDismiss={() => setErrorToast("")} />
    </div>
  );
}
