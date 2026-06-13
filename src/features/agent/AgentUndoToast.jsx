import { useEffect } from "react";
import { ArrowLeft, X } from "lucide-react";

export default function AgentUndoToast({ message, onUndo, onDismiss }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-6 z-[90] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-normal text-[#0F172A] sm:inset-x-auto sm:end-6 sm:start-auto"
    >
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="shrink-0 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#0F172A] transition-colors hover:bg-white"
      >
        تراجع
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-full p-1 text-[#64748B] transition-colors hover:bg-[#F8FAFC]"
        aria-label="إغلاق"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
