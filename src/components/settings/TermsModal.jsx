import { useTranslation } from "react-i18next";

export default function TermsModal({ isOpen, onClose }) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
    >
      <div className="md-surface w-full max-w-lg p-6">
        <h2
          id="terms-modal-title"
          className="mb-3 text-lg font-bold text-exeer-primary"
        >
          {t("settings.termsModal.title")}
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-exeer-muted">
          {t("settings.termsModal.body")}
        </p>
        <button type="button" onClick={onClose} className="md-btn-primary w-full">
          {t("settings.termsModal.close")}
        </button>
      </div>
    </div>
  );
}
