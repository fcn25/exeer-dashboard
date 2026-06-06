import { Link } from "react-router-dom";
import { ChevronLeft, Fingerprint } from "lucide-react";
import {
  MOCK_TODAY_ATTENDANCE,
  formatWorkingDuration,
} from "../../attendance/mobile/attendanceMockData.js";

export default function AttendanceHorizontalWidget() {
  const { lastPunch, workingMinutes } = MOCK_TODAY_ATTENDANCE;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-exeer-primary ring-1 ring-gray-100">
        <Fingerprint className="h-5 w-5 stroke-[1.5]" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-exeer-muted">آخر تسجيل</p>
        <p className="truncate text-sm font-bold text-exeer-primary">
          {lastPunch.time}
          <span className="mx-1.5 font-normal text-exeer-muted">·</span>
          {lastPunch.typeLabel}
        </p>
        <p className="text-[11px] text-exeer-muted">
          اليوم: {formatWorkingDuration(workingMinutes)}
        </p>
      </div>

      <Link
        to="/mobile/attendance"
        className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-exeer-primary px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 active:scale-[0.98]"
      >
        تسجيل
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}
