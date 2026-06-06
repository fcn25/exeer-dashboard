import { Clock, Timer, AlertCircle } from "lucide-react";
import { formatWorkingDuration } from "./attendanceMockData.js";

function SummaryRow({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex items-center gap-2.5 text-sm text-exeer-muted">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-exeer-primary dark:bg-slate-800">
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
    <section className="rounded-2xl border border-exeer-border bg-white p-5 shadow-sm dark:bg-md-surface">
      <h2 className="mb-1 text-sm font-bold text-exeer-primary">ملخص اليوم</h2>
      <p className="mb-4 text-xs text-exeer-muted">آخر تحديث من سجل البصمة</p>

      <div className="divide-y divide-exeer-border">
        <SummaryRow
          icon={Clock}
          label="آخر تسجيل"
          value={`${lastPunch.time} — ${lastPunch.typeLabel}`}
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
