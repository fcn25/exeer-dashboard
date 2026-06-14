import { SlidersHorizontal } from "lucide-react";
import MobilePageShell, {
  MobileStandaloneHeader,
} from "../../components/mobile/MobilePageShell.jsx";
import {
  MOBILE_CARD,
  MOBILE_TAB_ACTIVE,
  MOBILE_TAB_INACTIVE,
} from "../../components/home/homeStyles.js";
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
    <MobilePageShell dir={pageDir} lang={pageLang}>
      <MobileStandaloneHeader
        title={t("systemCustomization.title")}
        subtitle={t("systemCustomization.subtitle")}
        icon={SlidersHorizontal}
        backLabel={t("common.back")}
      />

      <main className="space-y-4 px-4 py-4">
        <nav
          className={`${MOBILE_CARD} flex gap-1 overflow-x-auto p-1.5`}
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
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap transition-colors ${
                  isActive ? MOBILE_TAB_ACTIVE : MOBILE_TAB_INACTIVE
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {t(`systemCustomization.tabs.${tab.id}`)}
              </button>
            );
          })}
        </nav>

        <section className={MOBILE_CARD}>
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

              <div className="mt-6 border-t border-[#F0EEEA] pt-4 dark:border-[rgba(255,255,255,0.06)]">
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
    </MobilePageShell>
  );
}
