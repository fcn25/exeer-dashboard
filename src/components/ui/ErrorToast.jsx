import { useEffect } from "react";
import { AlertCircle, X } from "lucide-react";

export default function ErrorToast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onDismiss, 5500);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-4 z-[80] mx-auto flex max-w-md items-center gap-3 rounded-md border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-900 sm:inset-x-auto sm:end-6 sm:start-auto sm:top-6 dark:border-red-900 dark:bg-red-950/90 dark:text-red-100"
    >
      <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md p-1 text-red-700 hover:bg-red-50 dark:text-red-200 dark:hover:bg-red-900"
        aria-label="إغلاق"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
