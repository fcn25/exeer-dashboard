import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { requestAccountDeletion } from "../../services/accountDeletionService.js";
import { signOut } from "../../utils/mobileAuth.js";

const CONFIRMATION_TOKEN = "DELETE";

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onDeleted,
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [confirmationText, setConfirmationText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setConfirmationText("");
      setIsSubmitting(false);
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canConfirmDelete =
    confirmationText.trim().toUpperCase() === CONFIRMATION_TOKEN && !isSubmitting;

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleContinue = () => {
    setError("");
    setStep(2);
  };

  const handleConfirmDelete = async () => {
    if (!canConfirmDelete) return;

    setIsSubmitting(true);
    setError("");

    try {
      await requestAccountDeletion();
      await signOut();
      onDeleted?.();
    } catch (err) {
      setError(err.message || t("settings.accountDeletion.error"));
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-modal-title"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-md border border-red-200 bg-white p-6 shadow-none dark:border-red-900 dark:bg-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="delete-account-modal-title"
          className="text-lg font-bold text-red-700 dark:text-red-400"
        >
          {t("settings.accountDeletion.title")}
        </h2>

        {step === 1 ? (
          <>
            <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {t("settings.accountDeletion.step1Message")}
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {t("settings.accountDeletion.cancel")}
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={isSubmitting}
                className="rounded-md bg-red-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                {t("settings.accountDeletion.continue")}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {t("settings.accountDeletion.step2Message")}
            </p>

            <input
              type="text"
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              disabled={isSubmitting}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="DELETE"
              className="mt-4 w-full rounded-md border border-gray-200 px-4 py-3 text-sm text-slate-900 outline-none ring-red-200 focus:border-red-400 focus:ring-2 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />

            {error ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {t("settings.accountDeletion.cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={!canConfirmDelete}
                className="inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {t("settings.accountDeletion.submitting")}
                  </>
                ) : (
                  t("settings.accountDeletion.confirmDelete")
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
