import { useCallback, useEffect, useState } from "react";
import { History, Sparkles, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import AgentConversation from "./AgentConversation.jsx";
import CommandHistory from "./CommandHistory.jsx";
import AgentUndoToast from "./AgentUndoToast.jsx";

export default function AgentDrawer({ isOpen, onClose }) {
  const { role } = useAuth();
  const isMobile = useIsMobile(769);
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);
  const [undoToast, setUndoToast] = useState("");

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

  useEffect(() => {
    if (!isOpen) {
      setShowHistoryMobile(false);
      setUndoToast("");
    }
  }, [isOpen]);

  const handleConfirmChange = useCallback(() => {
    setUndoToast("تم تغيير المسمى الوظيفي بنجاح");
  }, []);

  const handleUndo = useCallback(() => {
    console.log("undo mock job title change");
    setUndoToast("");
  }, []);

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
        className={`fixed z-[75] flex flex-col bg-white ${
          isMobile
            ? "inset-0"
            : "inset-y-0 right-0 w-full max-w-[640px] border-s border-[#E2E8F0]"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-drawer-title"
        dir="rtl"
        lang="ar"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-5 w-5 shrink-0 text-[#0F172A]" aria-hidden />
            <h1
              id="agent-drawer-title"
              className="truncate text-base font-semibold text-[#0F172A]"
            >
              الوكيل الذكي
            </h1>
          </div>

          <div className="flex items-center gap-1">
            {isMobile ? (
              <button
                type="button"
                onClick={() => setShowHistoryMobile((open) => !open)}
                className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
                  showHistoryMobile
                    ? "border-[#0F172A] bg-[#0F172A] text-white"
                    : "border-[#E2E8F0] bg-white text-[#0F172A]"
                }`}
                aria-pressed={showHistoryMobile}
              >
                <History className="h-3.5 w-3.5" aria-hidden />
                السجل
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E2E8F0] text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {isMobile && showHistoryMobile ? (
            <CommandHistory className="w-full border-s-0" />
          ) : (
            <>
              <AgentConversation
                role={role}
                onConfirmChange={handleConfirmChange}
                className="min-w-0 flex-1"
              />
              {!isMobile ? (
                <CommandHistory className="w-[230px] shrink-0" />
              ) : null}
            </>
          )}
        </div>
      </div>

      <AgentUndoToast
        message={undoToast}
        onUndo={handleUndo}
        onDismiss={() => setUndoToast("")}
      />
    </>
  );
}
