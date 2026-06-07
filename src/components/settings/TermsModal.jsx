import { useTranslation } from "react-i18next";
import { EXEER_TERMS_SECTIONS_AR } from "../../constants/exeerTermsOfService.js";

export default function TermsModal({ isOpen, onClose }) {
  const { t, i18n } = useTranslation();
  const isArabic = !i18n.language?.startsWith("en");

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
      onClick={onClose}
    >
      <div
        className="md-surface flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="terms-modal-title"
          className="mb-4 shrink-0 text-lg font-bold text-exeer-primary"
        >
          {t("settings.termsModal.title")}
        </h2>

        <div className="min-h-0 flex-1 overflow-y-auto pe-1">
          {isArabic ? (
            <div className="space-y-5 text-sm leading-relaxed text-exeer-muted">
              {EXEER_TERMS_SECTIONS_AR.map((section) => (
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
          ) : (
            <p className="text-sm leading-relaxed text-exeer-muted">
              {t("settings.termsModal.bodyEn")}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="md-btn-primary mt-6 w-full shrink-0"
        >
          {t("settings.termsModal.close")}
        </button>
      </div>
    </div>
  );
}
