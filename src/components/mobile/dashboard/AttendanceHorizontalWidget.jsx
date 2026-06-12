import { Link } from "react-router-dom";
import { ChevronLeft, Fingerprint } from "lucide-react";
import { formatWorkingDuration } from "../../../utils/attendance/summary.js";
import {
  HOME_BTN_PRIMARY,
  ICON_CHIP,
  MOBILE_CARD,
  TYPE_ITEM,
  TYPE_META,
} from "../../home/homeStyles.js";
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
    <div className={`${MOBILE_CARD} flex items-center gap-3`}>
      <span className={`${ICON_CHIP} h-11 w-11 rounded-[10px]`}>
        <Fingerprint className="h-5 w-5 stroke-[1.5]" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className={TYPE_META}>آخر تسجيل</p>
        <p className={`${TYPE_ITEM} truncate`}>
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
        <p className={TYPE_META}>اليوم: {formatWorkingDuration(workingMinutes)}</p>
      </div>

      {onPunch ? (
        <button
          type="button"
          onClick={onPunch}
          disabled={!canPunch || isPunching}
          className={`${HOME_BTN_PRIMARY} inline-flex shrink-0 items-center gap-1 px-3.5 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {isPunching ? "جاري التسجيل..." : (punchLabel ?? "تسجيل")}
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : (
        <Link
          to="/mobile/attendance"
          className={`${HOME_BTN_PRIMARY} inline-flex shrink-0 items-center gap-1 px-3.5 py-2 text-xs`}
        >
          تسجيل
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
