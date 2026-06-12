import { Clock, Timer, AlertCircle } from "lucide-react";
import { formatWorkingDuration } from "../../../utils/attendance/summary.js";
import {
  HOME_LIST_DIVIDE,
  HOME_LIST_ITEM,
  ICON_CHIP,
  MOBILE_CARD,
  TYPE_META,
  TYPE_SECTION,
} from "../../home/homeStyles.js";

function SummaryRow({ icon: Icon, label, value, accent }) {
  return (
    <div className={`${HOME_LIST_ITEM} flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-2.5 text-sm text-exeer-muted">
        <span className={`${ICON_CHIP} h-8 w-8`}>
          <Icon className="h-4 w-4 stroke-[1.75]" aria-hidden />
        </span>
        {label}
      </div>
      <p className={`text-sm font-bold ${accent ?? "text-exeer-primary"}`}>{value}</p>
    </div>
  );
}

export default function AttendanceTodaySummary({ data }) {
  const { lastPunch, workingMinutes, delayMinutes } = data;

  return (
    <section className={MOBILE_CARD}>
      <h2 className={TYPE_SECTION}>ملخص اليوم</h2>
      <p className={`${TYPE_META} mb-4 mt-1`}>آخر تحديث من سجل البصمة</p>

      <div className={HOME_LIST_DIVIDE}>
        <SummaryRow
          icon={Clock}
          label="آخر تسجيل"
          value={
            lastPunch?.time
              ? `${lastPunch.time} — ${lastPunch.typeLabel}`
              : "لم يُسجّل بعد"
          }
        />
        <SummaryRow
          icon={Timer}
          label="ساعات العمل اليوم"
          value={formatWorkingDuration(workingMinutes)}
          accent="text-emerald-700 dark:text-emerald-400"
        />
        <SummaryRow
          icon={AlertCircle}
          label="دقائق التأخير"
          value={delayMinutes > 0 ? `${delayMinutes} دقيقة` : "لا يوجد تأخير"}
          accent={
            delayMinutes > 0
              ? "text-amber-700 dark:text-amber-400"
              : "text-emerald-700 dark:text-emerald-400"
          }
        />
      </div>
    </section>
  );
}
