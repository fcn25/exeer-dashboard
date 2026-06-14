import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { hasQuickCreateAccess } from "../../constants/quickCreateActions.ts";
import { AGENT_PRIMARY_BTN } from "../../features/agent/agentStyles.js";
import QuickCreateMenu, {
  useQuickCreateCommandPalette,
} from "./QuickCreateMenu.jsx";

export default function QuickCreateButton({ className = "" }) {
  const { role } = useAuth();
  const anchorRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchMode, setSearchMode] = useState(false);

  const visible = hasQuickCreateAccess(role);

  useQuickCreateCommandPalette((withSearch) => {
    setSearchMode(Boolean(withSearch));
    setIsOpen(true);
  });

  if (!visible) return null;

  return (
    <div className={`relative min-w-[132px] ${className}`.trim()}>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => {
          setSearchMode(false);
          setIsOpen((open) => !open);
        }}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`${AGENT_PRIMARY_BTN} w-full whitespace-nowrap`}
      >
        <Plus className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden />
        الجديد
      </button>

      <QuickCreateMenu
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setSearchMode(false);
        }}
        anchorRef={anchorRef}
        searchMode={searchMode}
      />
    </div>
  );
}
