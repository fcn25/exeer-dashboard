import { useEffect } from "react";
import { X } from "lucide-react";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { AGENT_PANEL_DESKTOP, AGENT_PANEL_MOBILE } from "./agentStyles.js";

export default function AgentPanelShell({
  isOpen,
  onClose,
  title,
  titleIcon: TitleIcon,
  headerActions,
  children,
  ariaLabelledBy,
}) {
  const isMobile = useIsMobile(769);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-[rgba(15,23,42,0.4)]"
        role="presentation"
        onClick={onClose}
        aria-hidden
      />

      <div
        className={`fixed z-[75] flex flex-col bg-white dark:bg-[var(--bg-surface)] ${
          isMobile ? AGENT_PANEL_MOBILE : AGENT_PANEL_DESKTOP
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        dir="rtl"
        lang="ar"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white px-4 py-3 dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]">
          <div className="flex min-w-0 items-center gap-2">
            {TitleIcon ? (
              <TitleIcon className="h-5 w-5 shrink-0 text-[#0F172A] dark:text-[var(--text-primary)]" aria-hidden />
            ) : null}
            <h1
              id={ariaLabelledBy}
              className="truncate text-base font-semibold text-[#0F172A] dark:text-[var(--text-primary)]"
            >
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-1">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E2E8F0] text-[#0F172A] transition-colors hover:bg-[#F8FAFC] dark:border-[var(--border-color)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-surface-hover)]"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col bg-[#F8FAFC] dark:bg-[var(--bg-main)]">{children}</div>
      </div>
    </>
  );
}
