import { Link } from "react-router-dom";
import { ChevronLeft, Fingerprint } from "lucide-react";
import {
  MOCK_TODAY_ATTENDANCE,
  formatWorkingDuration,
} from "./attendanceMockData.js";

export default function AttendanceDashboardWidget() {
  const { lastPunch, workingMinutes } = MOCK_TODAY_ATTENDANCE;

  return (
    <Link
      to="/mobile/attendance"
      className="group relative flex aspect-square w-full flex-col justify-between overflow-hidden rounded-3xl border border-exeer-border bg-gradient-to-br from-slate-50 to-blue-50/60 p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md active:scale-[0.98] dark:from-slate-900 dark:to-slate-800/80"
      aria-label="الحضور والبصمة — عرض التفاصيل"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 text-exeer-primary transition-transform group-hover:scale-105 dark:bg-slate-800 dark:ring-slate-700">
          <Fingerprint className="h-6 w-6 stroke-[1.5]" aria-hidden />
        </span>
        <ChevronLeft
          className="h-5 w-5 shrink-0 text-exeer-muted transition-transform group-hover:-translate-x-0.5"
          aria-hidden
        />
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-exeer-muted">آخر تسجيل</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight text-exeer-primary">
            {lastPunch.time}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-exeer-primary shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800/90 dark:ring-slate-700">
            {lastPunch.typeLabel}
          </span>
          <span className="text-xs text-exeer-muted">
            اليوم: {formatWorkingDuration(workingMinutes)}
          </span>
        </div>
      </div>

      <p className="text-[11px] font-medium text-exeer-muted/80">
        الحضور والبصمة
      </p>
    </Link>
  );
}
