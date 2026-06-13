import AgentButton from "./AgentButton.jsx";
import AddEmployeeButton from "./AddEmployeeButton.jsx";

export default function DashboardActionStack({ onOpenAgent }) {
  return (
    <div className="flex w-full min-w-[200px] max-w-[240px] flex-col gap-[10px] sm:w-[220px]">
      <AgentButton onClick={onOpenAgent} />
      <AddEmployeeButton />
    </div>
  );
}
