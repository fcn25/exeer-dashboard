import { Link } from "react-router-dom";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import SuccessToast from "../components/ui/SuccessToast.jsx";
import ErrorToast from "../components/ui/ErrorToast.jsx";
import { TabSaveButton } from "../components/settings/system/SettingControls.jsx";
import SystemCustomizationPanels from "../components/settings/system/SystemCustomizationPanels.jsx";
import { SYSTEM_CUSTOMIZATION_TABS } from "../components/settings/system/systemCustomizationConfig.js";
import { useSystemCustomizationForm } from "../hooks/useSystemCustomizationForm.js";

export default function SystemCustomizationPage() {
  const { t } = useTranslation();
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

  if (isLoading) {
    return (
      <div className="md-page">
        <p className="text-sm text-exeer-muted">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="md-page">
      <header className="space-y-2">
        <Link
          to="/dashboard/settings"
          className="inline-flex items-center gap-1 text-sm text-exeer-muted transition-colors hover:text-exeer-primary"
        >
          <ArrowRight className="h-4 w-4" aria-hidden />
          {t("systemCustomization.backToSettings")}
        </Link>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-md-primary-container text-exeer-primary dark:bg-slate-800">
            <SlidersHorizontal className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="md-page-title">{t("systemCustomization.title")}</h1>
            <p className="text-sm text-exeer-muted">
              {t("systemCustomization.subtitle")}
            </p>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-8">
        <nav
          className="md-surface flex shrink-0 flex-row gap-1 overflow-x-auto p-2 lg:w-56 lg:flex-col lg:overflow-visible"
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
                className={`md-settings-tab whitespace-nowrap ${
                  isActive ? "md-settings-tab-active" : ""
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden />
                {t(`systemCustomization.tabs.${tab.id}`)}
              </button>
            );
          })}
        </nav>

        <section className="md-surface min-w-0 flex-1 p-6 md:p-8">
          <SystemCustomizationPanels
            activeTab={activeTab}
            draft={draft}
            updateDraft={updateDraft}
          />

          <div className="mt-8 flex justify-end border-t border-exeer-border pt-6">
            <TabSaveButton
              onClick={handleSaveTab}
              isSaving={savingTab === activeTab}
              disabled={!tabDirty}
            />
          </div>
        </section>
      </div>

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
      <ErrorToast message={errorToast} onDismiss={() => setErrorToast("")} />
    </div>
  );
}
