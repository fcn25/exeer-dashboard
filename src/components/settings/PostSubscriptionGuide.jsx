import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Rocket,
  SlidersHorizontal,
  Upload,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  SUPPORT_EMAIL_ADDRESS,
  SUPPORT_EMAIL_HREF,
  SUPPORT_WHATSAPP_DISPLAY,
  SUPPORT_WHATSAPP_HREF,
} from "../../constants/supportContact.js";

const STEP_ICONS = [SlidersHorizontal, Upload, Rocket];

export default function PostSubscriptionGuide() {
  const { t } = useTranslation();
  const steps = t("settings.postSubscription.steps", {
    returnObjects: true,
  });

  const stepList = Array.isArray(steps) ? steps : [];

  return (
    <section className="md-surface-muted max-w-2xl space-y-4 p-5">
      <header className="space-y-1">
        <h3 className="text-base font-bold text-exeer-primary">
          {t("settings.postSubscription.title")}
        </h3>
        <p className="text-sm text-exeer-muted">
          {t("settings.postSubscription.subtitle")}
        </p>
      </header>

      <ol className="space-y-4">
        {stepList.map((step, index) => {
          const Icon = STEP_ICONS[index] ?? CheckCircle2;
          return (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-exeer-primary dark:bg-[#334155]">
                <Icon className="h-4 w-4 stroke-[1.75]" aria-hidden />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-exeer-primary">
                  {index + 1}. {step.title}
                </p>
                <p className="text-sm leading-relaxed text-exeer-muted">
                  {step.body}
                </p>
                {step.linkLabel && step.linkTo ? (
                  <Link
                    to={step.linkTo}
                    className="inline-block text-sm font-medium text-exeer-primary underline-offset-2 hover:underline"
                  >
                    {step.linkLabel}
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-semibold">{t("settings.postSubscription.noteTitle")}</p>
        <p className="mt-1">{t("settings.postSubscription.noteBody")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-exeer-border pt-4 text-sm">
        <Users className="h-4 w-4 text-exeer-muted" aria-hidden />
        <span className="text-exeer-muted">
          {t("settings.postSubscription.contactPrompt")}
        </span>
        <a
          href={SUPPORT_EMAIL_HREF}
          className="font-medium text-exeer-primary hover:underline"
          dir="ltr"
        >
          {SUPPORT_EMAIL_ADDRESS}
        </a>
        <span className="text-exeer-muted">·</span>
        <a
          href={SUPPORT_WHATSAPP_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-exeer-primary hover:underline"
          dir="ltr"
        >
          {SUPPORT_WHATSAPP_DISPLAY}
        </a>
      </div>
    </section>
  );
}
