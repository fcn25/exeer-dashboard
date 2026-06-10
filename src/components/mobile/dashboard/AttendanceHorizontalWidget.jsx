import { Link } from "react-router-dom";
import { ChevronLeft, Fingerprint } from "lucide-react";
import { formatWorkingDuration } from "../../../utils/attendance/summary.js";
import { AttendanceWidgetSkeleton } from "./MobileDashboardSkeleton.jsx";

export default function AttendanceHorizontalWidget({
  attendance,
  isLoading,
  onPunch,
  isPunching = false,
  canPunch = true,
  punchLabel,
}) {
  if (isLoading) {
    return <AttendanceWidgetSkeleton />;
  }

  const lastPunch = attendance?.lastPunch;
  const workingMinutes = attendance?.workingMinutes ?? 0;
  const hasPunch = Boolean(lastPunch?.time && lastPunch.time !== "—");

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-exeer-border bg-md-surface p-4 shadow-sm dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-md-primary-container text-exeer-primary dark:bg-[var(--bg-surface-hover)] dark:text-[var(--text-primary)]">
        <Fingerprint className="h-5 w-5 stroke-[1.5]" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-exeer-muted">آخر تسجيل</p>
        <p className="truncate text-sm font-bold text-exeer-primary">
          {hasPunch ? (
            <>
              {lastPunch.time}
              <span className="mx-1.5 font-normal text-exeer-muted">·</span>
              {lastPunch.typeLabel}
            </>
          ) : (
            "لم يُسجّل حضور اليوم"
          )}
        </p>
        <p className="text-[11px] text-exeer-muted">
          اليوم: {formatWorkingDuration(workingMinutes)}
        </p>
      </div>

      {onPunch ? (
        <button
          type="button"
          onClick={onPunch}
          disabled={!canPunch || isPunching}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-exeer-primary px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPunching ? "جاري التسجيل..." : (punchLabel ?? "تسجيل")}
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : (
        <Link
          to="/mobile/attendance"
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-exeer-primary px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 active:scale-[0.98]"
        >
          تسجيل
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
