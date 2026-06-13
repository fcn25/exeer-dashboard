import { useCallback, useState } from "react";
import { History, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import AgentPanelShell from "./AgentPanelShell.jsx";
import AgentConversation from "./AgentConversation.jsx";
import CommandHistory from "./CommandHistory.jsx";
import AgentUndoToast from "./AgentUndoToast.jsx";

export default function AgentDrawer({
  isOpen,
  onClose,
  initialPrefill = "",
  prefillKey = 0,
}) {
  const { role } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  const [undoToast, setUndoToast] = useState("");

  const handleConfirmChange = useCallback(() => {
    setUndoToast("تم تغيير المسمى الوظيفي بنجاح");
  }, []);

  const handleUndo = useCallback(() => {
    console.log("undo mock job title change");
    setUndoToast("");
  }, []);

  const handleClose = useCallback(() => {
    setShowHistory(false);
    setUndoToast("");
    onClose();
  }, [onClose]);

  return (
    <>
      <AgentPanelShell
        isOpen={isOpen}
        onClose={handleClose}
        title="الوكيل الذكي"
        titleIcon={Sparkles}
        ariaLabelledBy="agent-drawer-title"
        headerActions={
          <button
            type="button"
            onClick={() => setShowHistory((open) => !open)}
            className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
              showHistory
                ? "border-[#0F172A] bg-[#0F172A] text-white"
                : "border-[#E2E8F0] bg-white text-[#0F172A]"
            }`}
            aria-pressed={showHistory}
          >
            <History className="h-3.5 w-3.5" aria-hidden />
            السجل
          </button>
        }
      >
        {showHistory ? (
          <CommandHistory
            className="w-full border-s-0 bg-white"
            variant="compact"
          />
        ) : (
          <AgentConversation
            role={role}
            onConfirmChange={handleConfirmChange}
            initialPrefill={initialPrefill}
            prefillKey={prefillKey}
            className="min-h-0 flex-1"
          />
        )}
      </AgentPanelShell>

      <AgentUndoToast
        message={undoToast}
        onUndo={handleUndo}
        onDismiss={() => setUndoToast("")}
      />
    </>
  );
}
