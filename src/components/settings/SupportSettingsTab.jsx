import { useState } from "react";
import { FileText, Mail, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import TermsModal from "./TermsModal.jsx";
import {
  SUPPORT_EMAIL_ADDRESS,
  SUPPORT_EMAIL_HREF,
} from "../../constants/supportContact.js";

const SUPPORT_WHATSAPP = "https://wa.me/966500000000";

export default function SupportSettingsTab() {
  const { t } = useTranslation();
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  return (
    <>
      <div className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-lg font-bold text-exeer-primary">
            {t("settings.support.title")}
          </h2>
          <p className="text-sm text-exeer-muted">
            {t("settings.support.description")}
          </p>
        </header>

        <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <a
            href={SUPPORT_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="md-surface flex items-center gap-4 p-5 transition-colors hover:bg-exeer-hover"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <MessageCircle className="h-5 w-5 stroke-[1.75]" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-exeer-primary">
                {t("settings.support.whatsapp")}
              </span>
              <span className="text-xs text-exeer-muted" dir="ltr">
                +966 50 000 0000
              </span>
            </span>
          </a>

          <a
            href={SUPPORT_EMAIL_HREF}
            className="md-surface flex items-center gap-4 p-5 transition-colors hover:bg-exeer-hover"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-md-primary-container text-exeer-primary dark:bg-[#1e3a5f] dark:text-[#e2e8f0]">
              <Mail className="h-5 w-5 stroke-[1.75]" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-exeer-primary">
                {t("settings.support.email")}
              </span>
              <span className="text-xs text-exeer-muted" dir="ltr">
                {SUPPORT_EMAIL_ADDRESS}
              </span>
            </span>
          </a>
        </div>

        <button
          type="button"
          onClick={() => setIsTermsOpen(true)}
          className="md-surface-muted flex w-full max-w-2xl items-center gap-4 p-5 text-start transition-colors hover:bg-exeer-hover"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-exeer-primary dark:bg-[#334155] dark:text-[#f1f5f9]">
            <FileText className="h-5 w-5 stroke-[1.75]" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-semibold text-exeer-primary">
              {t("settings.support.terms")}
            </span>
            <span className="text-xs text-exeer-muted">
              {t("settings.support.termsHint")}
            </span>
          </span>
        </button>
      </div>

      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </>
  );
}
