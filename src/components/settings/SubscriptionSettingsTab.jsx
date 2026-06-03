import { Check, Crown, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CreateSubscriberButton } from "./CreateSubscriberModal.jsx";

const TIERS = [
  {
    id: "basic",
    highlighted: false,
    features: { employees: true, payroll: true, ai: false, support: false },
  },
  {
    id: "pro",
    highlighted: true,
    features: { employees: true, payroll: true, ai: true, support: false },
  },
  {
    id: "enterprise",
    highlighted: false,
    features: { employees: true, payroll: true, ai: true, support: true },
  },
];

const FEATURE_KEYS = ["employees", "payroll", "ai", "support"];

export default function SubscriptionSettingsTab() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-exeer-primary">
            {t("settings.subscription.title")}
          </h2>
          <p className="text-sm text-exeer-muted">
            {t("settings.subscription.description")}
          </p>
        </div>
        <CreateSubscriberButton />
      </header>

      <article className="md-surface relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -end-8 -top-8 h-32 w-32 rounded-full bg-md-primary-container opacity-60 dark:bg-[#1e3a5f]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-md-primary text-white dark:bg-[#2563eb]">
              <Crown className="h-7 w-7 stroke-[1.75]" aria-hidden />
            </span>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-exeer-muted">
                {t("settings.subscription.currentPlan")}
              </p>
              <p className="text-2xl font-bold text-exeer-primary">Exeer Pro</p>
              <p className="text-sm text-exeer-muted">
                {t("settings.subscription.planName")}: Exeer Pro ·{" "}
                {t("settings.subscription.expiry")}: 31/12/2026
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Sparkles className="h-4 w-4" aria-hidden />
            {t("settings.subscription.active")}
          </span>
        </div>
      </article>

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-exeer-primary">
            {t("settings.subscription.upgradeTitle")}
          </h3>
          <p className="text-sm text-exeer-muted">
            {t("settings.subscription.upgradeDescription")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <article
              key={tier.id}
              className={`md-surface flex flex-col p-5 ${
                tier.highlighted
                  ? "ring-2 ring-md-primary dark:ring-[#2563eb]"
                  : ""
              }`}
            >
              <h4 className="text-base font-bold text-exeer-primary">
                {t(`settings.subscription.tiers.${tier.id}`)}
              </h4>
              <ul className="mt-4 flex flex-1 flex-col gap-2.5">
                {FEATURE_KEYS.map((featureKey) => {
                  const included = tier.features[featureKey];
                  return (
                    <li
                      key={featureKey}
                      className={`flex items-center gap-2 text-sm ${
                        included ? "text-exeer-primary" : "text-exeer-muted"
                      }`}
                    >
                      <Check
                        className={`h-4 w-4 shrink-0 stroke-[2] ${
                          included ? "text-emerald-600 dark:text-emerald-400" : "opacity-30"
                        }`}
                        aria-hidden
                      />
                      {t(`settings.subscription.features.${featureKey}`)}
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                disabled={tier.highlighted}
                className={`mt-6 w-full ${
                  tier.highlighted ? "md-btn-tonal opacity-60" : "md-btn-primary"
                }`}
              >
                {tier.highlighted
                  ? t("settings.subscription.active")
                  : t("settings.subscription.upgradeCta")}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
