import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import DeleteAccountModal from "./DeleteAccountModal.jsx";

/**
 * Shared "Danger zone" — account self-deletion (Guideline 5.1.1).
 * No platform or role checks; render wherever settings are shown.
 */
export default function AccountDeletionSection({ className = "", onBeforeNavigate }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);

  const handleAccountDeleted = () => {
    onBeforeNavigate?.();
    navigate("/login", {
      replace: true,
      state: {
        accountDeletionSuccess: t("settings.accountDeletion.successMessage"),
      },
    });
  };

  return (
    <>
      <section
        className={`space-y-3 rounded-md border border-red-200 bg-red-50/60 p-4 dark:border-red-900/50 dark:bg-red-950/20 ${className}`}
        aria-labelledby="account-deletion-section-title"
      >
        <p id="account-deletion-section-title" className="md-label text-red-800 dark:text-red-300">
          {t("settings.accountDeletion.dangerZone")}
        </p>
        <button
          type="button"
          onClick={() => setIsDeleteAccountOpen(true)}
          className="flex w-full items-center gap-3 rounded-md border border-red-200 bg-white px-4 py-3.5 text-start text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/40"
        >
          <Trash2 className="h-5 w-5 shrink-0 stroke-[1.75]" aria-hidden />
          <span className="min-w-0">
            <span className="block">{t("settings.accountDeletion.button")}</span>
            <span className="block text-xs font-normal text-red-600/80 dark:text-red-400/80">
              {t("settings.accountDeletion.buttonHint")}
            </span>
          </span>
        </button>
      </section>

      <DeleteAccountModal
        isOpen={isDeleteAccountOpen}
        onClose={() => setIsDeleteAccountOpen(false)}
        onDeleted={handleAccountDeleted}
      />
    </>
  );
}
