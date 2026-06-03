import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

export default function SuccessToast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onDismiss, 4500);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 top-4 z-[80] mx-auto flex max-w-md items-center gap-3 rounded-md border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-900 sm:inset-x-auto sm:end-6 sm:start-auto sm:top-6"
    >
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md p-1 text-emerald-700 hover:bg-emerald-50"
        aria-label="إغلاق"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
