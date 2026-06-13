import ExecutorButton from "./ExecutorButton.jsx";
import QueryButton from "./QueryButton.jsx";

export default function DashboardAgentActions({ onOpenExecutor, onOpenQuery }) {
  return (
    <div className="flex items-stretch gap-[10px]">
      <ExecutorButton onClick={onOpenExecutor} />
      <QueryButton onClick={onOpenQuery} />
    </div>
  );
}
