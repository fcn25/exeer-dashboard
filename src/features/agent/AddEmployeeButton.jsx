import { UserPlus } from "lucide-react";
import { AGENT_SECONDARY_BTN } from "./agentStyles.js";

export default function AddEmployeeButton({ onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${AGENT_SECONDARY_BTN} w-full ${className}`.trim()}
    >
      <UserPlus className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden />
      إضافة موظف جديد
    </button>
  );
}
