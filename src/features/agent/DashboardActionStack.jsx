import AgentButton from "./AgentButton.jsx";
import AddEmployeeButton from "./AddEmployeeButton.jsx";

export default function DashboardActionStack({ onOpenAgent, onOpenAddEmployee }) {
  return (
    <div className="flex w-[220px] max-w-full flex-col gap-[10px]">
      <AgentButton onClick={onOpenAgent} />
      <AddEmployeeButton onClick={onOpenAddEmployee} />
    </div>
  );
}
