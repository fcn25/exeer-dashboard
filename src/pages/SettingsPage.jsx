import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CreditCard,
  History,
  LifeBuoy,
  Palette,
  Settings2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import GeneralSettingsTab from "../components/settings/GeneralSettingsTab.jsx";
import AppearanceSettingsTab from "../components/settings/AppearanceSettingsTab.jsx";
import SupportSettingsTab from "../components/settings/SupportSettingsTab.jsx";
import SubscriptionSettingsTab from "../components/settings/SubscriptionSettingsTab.jsx";
import SystemUpdatesTab from "../components/settings/SystemUpdatesTab.jsx";
import { isOwner } from "../utils/rbac.js";

const TAB_DEFS = [
  { id: "general", icon: Settings2, adminOnly: false },
  { id: "appearance", icon: Palette, adminOnly: false },
  { id: "support", icon: LifeBuoy, adminOnly: false },
  { id: "updates", icon: History, adminOnly: true },
  { id: "subscription", icon: CreditCard, adminOnly: true },
];

function TabPanel({ tabId, activeTab, children }) {
  if (tabId !== activeTab) return null;
  return <div className="min-w-0 flex-1">{children}</div>;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const showSubscription = isOwner();
  const visibleTabs = useMemo(
    () => TAB_DEFS.filter((tab) => !tab.adminOnly || showSubscription),
    [showSubscription],
  );

  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "general");

  const resolvedTab = visibleTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : visibleTabs[0]?.id ?? "general";

  useEffect(() => {
    if (tabFromUrl && visibleTabs.some((tab) => tab.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, visibleTabs]);

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "general") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: tabId }, { replace: true });
    }
  };

  return (
    <div className="md-page">
      <header className="space-y-2">
        <h1 className="md-page-title">{t("settings.title")}</h1>
        <p className="text-sm text-exeer-muted">{t("settings.subtitle")}</p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-8">
        <nav
          className="md-surface flex shrink-0 flex-row gap-1 overflow-x-auto p-2 lg:w-56 lg:flex-col lg:overflow-visible"
          aria-label={t("settings.title")}
        >
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = resolvedTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`md-settings-tab whitespace-nowrap ${
                  isActive ? "md-settings-tab-active" : ""
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden />
                {t(`settings.tabs.${tab.id}`)}
              </button>
            );
          })}
        </nav>

        <section className="md-surface min-w-0 flex-1 p-6 md:p-8">
          <TabPanel tabId="general" activeTab={resolvedTab}>
            <GeneralSettingsTab />
          </TabPanel>
          <TabPanel tabId="appearance" activeTab={resolvedTab}>
            <AppearanceSettingsTab />
          </TabPanel>
          <TabPanel tabId="support" activeTab={resolvedTab}>
            <SupportSettingsTab />
          </TabPanel>
          {showSubscription ? (
            <>
              <TabPanel tabId="updates" activeTab={resolvedTab}>
                <SystemUpdatesTab />
              </TabPanel>
              <TabPanel tabId="subscription" activeTab={resolvedTab}>
                <SubscriptionSettingsTab />
              </TabPanel>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
