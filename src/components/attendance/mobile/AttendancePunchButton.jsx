import { useState } from "react";
import { Fingerprint, Loader2 } from "lucide-react";

export default function AttendancePunchButton({
  label,
  onPunch,
  disabled = false,
}) {
  const [isPunching, setIsPunching] = useState(false);

  const handleClick = async () => {
    if (isPunching || disabled) return;
    setIsPunching(true);

    try {
      await onPunch?.();
    } finally {
      setIsPunching(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPunching || disabled}
        aria-label={label}
        className="group relative flex h-36 w-36 items-center justify-center rounded-full bg-exeer-primary text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {!isPunching && !disabled ? (
          <span
            className="absolute inset-0 rounded-full bg-exeer-primary/30 animate-ping"
            aria-hidden
          />
        ) : null}
        <span
          className="absolute -inset-3 rounded-full bg-blue-100/50 opacity-70 blur-md transition-opacity group-hover:opacity-100 dark:bg-blue-900/30"
          aria-hidden
        />
        <span className="relative flex h-[calc(100%-8px)] w-[calc(100%-8px)] items-center justify-center rounded-full border border-white/20 bg-exeer-primary shadow-inner">
          {isPunching ? (
            <Loader2 className="h-12 w-12 animate-spin stroke-[1.5]" aria-hidden />
          ) : (
            <Fingerprint className="h-12 w-12 stroke-[1.25]" aria-hidden />
          )}
        </span>
      </button>

      <div className="space-y-1 text-center">
        <p className="text-sm font-bold text-exeer-primary">
          {isPunching
            ? "جاري التحقق البيومتري والموقع..."
            : disabled
              ? "التسجيل غير متاح"
              : "المصادقة / التسجيل"}
        </p>
        <p className="text-xs text-exeer-muted">{label}</p>
      </div>
    </div>
  );
}
