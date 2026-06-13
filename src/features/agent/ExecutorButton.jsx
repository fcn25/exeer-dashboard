import { Sparkles } from "lucide-react";
import { AGENT_PRIMARY_BTN } from "./agentStyles.js";

export default function ExecutorButton({ onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${AGENT_PRIMARY_BTN} shrink-0 whitespace-nowrap ${className}`.trim()}
    >
      <Sparkles className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden />
      الوكيل الذكي
    </button>
  );
}
