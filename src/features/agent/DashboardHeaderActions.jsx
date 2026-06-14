import { ENABLE_AI_AGENT } from "../../constants/featureFlags.js";
import ExecutorButton from "./ExecutorButton.jsx";
import QueryButton from "./QueryButton.jsx";
import QuickCreateButton from "../../components/quick-create/QuickCreateButton.jsx";

export default function DashboardHeaderActions({ onOpenExecutor, onOpenQuery }) {
  return (
    <div className="flex w-full max-w-md items-stretch justify-end gap-2.5 sm:w-auto sm:max-w-none rtl:justify-start">
      <QuickCreateButton className="flex-1 sm:flex-initial" />
      <QueryButton
        onClick={onOpenQuery}
        className="flex-1 sm:flex-initial min-w-[132px]"
      />
      {ENABLE_AI_AGENT ? (
        <ExecutorButton onClick={onOpenExecutor} className="shrink-0" />
      ) : null}
    </div>
  );
}
