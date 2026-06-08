import { Fingerprint, Loader2, LogIn, LogOut } from "lucide-react";

export default function AttendancePunchButton({
  label,
  onPunch,
  disabled = false,
  isProcessing = false,
  mode = "check_in",
  disabledHint = "",
  statusText = "",
}) {
  const isCheckOut = mode === "check_out";
  const isComplete = mode === "complete";
  const Icon = isCheckOut ? LogOut : isComplete ? Fingerprint : LogIn;

  const handleClick = () => {
    if (isProcessing || disabled) return;
    onPunch?.();
  };

  const primaryStatus =
    statusText ||
    (isProcessing
      ? "جاري التحقق والتسجيل..."
      : disabled && disabledHint
        ? disabledHint
        : isCheckOut
          ? "تسجيل الانصراف"
          : isComplete
            ? "اكتمل التسجيل اليوم"
            : "تسجيل الحضور");

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isProcessing || disabled}
        aria-label={label}
        className={`group relative flex h-36 w-36 items-center justify-center rounded-full text-white shadow-md transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 ${
          isCheckOut
            ? "bg-slate-600 dark:bg-slate-700"
            : "bg-exeer-primary hover:scale-[1.02]"
        }`}
      >
        {!isProcessing && !disabled && !isComplete ? (
          <span
            className="absolute inset-0 rounded-full bg-exeer-primary/30 animate-ping"
            aria-hidden
          />
        ) : null}
        <span
          className="absolute -inset-3 rounded-full bg-blue-100/50 opacity-70 blur-md dark:bg-blue-900/30"
          aria-hidden
        />
        <span className="relative flex h-[calc(100%-8px)] w-[calc(100%-8px)] items-center justify-center rounded-full border border-white/20 bg-inherit shadow-inner">
          {isProcessing ? (
            <Loader2 className="h-12 w-12 animate-spin stroke-[1.5]" aria-hidden />
          ) : (
            <Icon className="h-12 w-12 stroke-[1.25]" aria-hidden />
          )}
        </span>
      </button>

      <div className="space-y-1 text-center">
        <p className="text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]">
          {primaryStatus}
        </p>
        <p className="text-xs text-exeer-muted dark:text-[var(--text-secondary)]">
          {label}
        </p>
      </div>
    </div>
  );
}
