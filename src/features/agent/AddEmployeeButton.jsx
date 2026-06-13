import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { AGENT_SECONDARY_BTN } from "./agentStyles.js";

export default function AddEmployeeButton({ className = "" }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate("/dashboard/employees?add=1")}
      className={`${AGENT_SECONDARY_BTN} w-full ${className}`.trim()}
    >
      <UserPlus className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden />
      إضافة موظف جديد
    </button>
  );
}
