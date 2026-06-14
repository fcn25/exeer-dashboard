import { FileBarChart } from "lucide-react";
import { AGENT_SECONDARY_BTN } from "./agentStyles.js";

export default function QueryButton({ onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${AGENT_SECONDARY_BTN} shrink-0 whitespace-nowrap ${className}`.trim()}
    >
      <FileBarChart className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden />
      تقرير حسابك
    </button>
  );
}
