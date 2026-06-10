import { useTranslation } from "react-i18next";
import {
  EXEER_PRIVACY_POLICY_LAST_UPDATED_AR,
  EXEER_PRIVACY_POLICY_LAST_UPDATED_EN,
  EXEER_PRIVACY_POLICY_SECTIONS_AR,
  EXEER_PRIVACY_POLICY_SECTIONS_EN,
} from "../../constants/exeerPrivacyPolicy.js";

export default function PrivacyPolicyModal({ isOpen, onClose }) {
  const { t, i18n } = useTranslation();
  const isArabic = !i18n.language?.startsWith("en");
  const sections = isArabic
    ? EXEER_PRIVACY_POLICY_SECTIONS_AR
    : EXEER_PRIVACY_POLICY_SECTIONS_EN;
  const lastUpdated = isArabic
    ? EXEER_PRIVACY_POLICY_LAST_UPDATED_AR
    : EXEER_PRIVACY_POLICY_LAST_UPDATED_EN;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      onClick={onClose}
    >
      <div
        className="md-surface flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="privacy-modal-title"
          className="mb-2 shrink-0 text-lg font-bold text-exeer-primary"
        >
          {t("settings.privacyModal.title")}
        </h2>
        <p className="mb-4 shrink-0 text-xs text-exeer-muted">{lastUpdated}</p>

        <div className="min-h-0 flex-1 overflow-y-auto pe-1">
          <div className="space-y-5 text-sm leading-relaxed text-exeer-muted">
            {sections.map((section) => (
              <section key={section.title}>
                <h3 className="mb-2 font-bold text-exeer-primary">
                  {section.title}
                </h3>
                <div className="space-y-2">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="md-btn-primary mt-6 w-full shrink-0"
        >
          {t("settings.privacyModal.close")}
        </button>
      </div>
    </div>
  );
}
