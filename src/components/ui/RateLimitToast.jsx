import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function RateLimitToast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-4 z-[80] mx-auto flex max-w-md items-center gap-3 rounded-md border border-amber-200 bg-white px-4 py-3 text-sm text-amber-900 sm:inset-x-auto sm:end-6 sm:start-auto sm:top-6"
    >
      <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md p-1 hover:bg-amber-50"
        aria-label="إغلاق"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
