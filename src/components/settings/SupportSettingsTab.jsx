import { useState } from "react";
import { FileText, Mail, MessageCircle, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import TermsModal from "./TermsModal.jsx";
import PrivacyPolicyModal from "./PrivacyPolicyModal.jsx";
import PostSubscriptionGuide from "./PostSubscriptionGuide.jsx";
import FeedbackSettingsSection from "./FeedbackSettingsSection.jsx";
import {
  SUPPORT_EMAIL_ADDRESS,
  SUPPORT_EMAIL_HREF,
  SUPPORT_WHATSAPP_DISPLAY,
  SUPPORT_WHATSAPP_HREF,
} from "../../constants/supportContact.js";
import { canShowBilling } from "../../lib/platform.ts";

export default function SupportSettingsTab() {
  const { t } = useTranslation();
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  return (
    <>
      <div className="w-full min-w-0 space-y-6 pb-2">
        <header className="space-y-1">
          <h2 className="text-lg font-bold text-exeer-primary">
            {t("settings.support.title")}
          </h2>
          <p className="text-sm text-exeer-muted">
            {t("settings.support.description")}
          </p>
        </header>

        <FeedbackSettingsSection />

        <div className="w-full min-w-0 space-y-4 rounded-md border border-exeer-border bg-[#fafafa] p-4 md:p-6 dark:bg-slate-900/40">
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            <a
              href={SUPPORT_WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="md-surface flex min-w-0 items-center gap-4 p-5 transition-colors hover:bg-exeer-hover"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <MessageCircle className="h-5 w-5 stroke-[1.75]" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-exeer-primary">
                  {t("settings.support.whatsapp")}
                </span>
                <span
                  className="block break-words text-xs text-exeer-muted"
                  dir="ltr"
                >
                  {SUPPORT_WHATSAPP_DISPLAY}
                </span>
              </span>
            </a>

            <a
              href={SUPPORT_EMAIL_HREF}
              className="md-surface flex min-w-0 items-center gap-4 p-5 transition-colors hover:bg-exeer-hover"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-md-primary-container text-exeer-primary dark:bg-[#1e3a5f] dark:text-[#e2e8f0]">
                <Mail className="h-5 w-5 stroke-[1.75]" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-exeer-primary">
                  {t("settings.support.email")}
                </span>
                <span
                  className="block break-all text-xs text-exeer-muted"
                  dir="ltr"
                >
                  {SUPPORT_EMAIL_ADDRESS}
                </span>
              </span>
            </a>
          </div>

          <button
            type="button"
            onClick={() => setIsTermsOpen(true)}
            className="md-surface flex w-full min-w-0 items-center gap-4 p-5 text-start transition-colors hover:bg-exeer-hover"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white text-exeer-primary dark:bg-[#334155] dark:text-[#f1f5f9]">
              <FileText className="h-5 w-5 stroke-[1.75]" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-exeer-primary">
                {t("settings.support.terms")}
              </span>
              <span className="block text-xs leading-relaxed text-exeer-muted">
                {t("settings.support.termsHint")}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrivacyOpen(true)}
            className="md-surface flex w-full min-w-0 items-center gap-4 p-5 text-start transition-colors hover:bg-exeer-hover"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white text-exeer-primary dark:bg-[#334155] dark:text-[#f1f5f9]">
              <Shield className="h-5 w-5 stroke-[1.75]" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-exeer-primary">
                {t("settings.support.privacy")}
              </span>
              <span className="block text-xs leading-relaxed text-exeer-muted">
                {t("settings.support.privacyHint")}
              </span>
            </span>
          </button>

          {canShowBilling() ? <PostSubscriptionGuide /> : null}
        </div>
      </div>

      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <PrivacyPolicyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </>
  );
}
