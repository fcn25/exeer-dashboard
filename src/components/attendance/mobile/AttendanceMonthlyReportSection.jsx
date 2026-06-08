import { AlertCircle, CalendarDays, Timer, UserCheck, UserX } from "lucide-react";
import { useTranslation } from "react-i18next";

function ReportStat({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-xl border border-exeer-border bg-slate-50/80 px-3 py-3 dark:border-[var(--border-color)] dark:bg-[var(--bg-main)]">
      <div className="flex items-center gap-2 text-xs text-exeer-muted dark:text-[var(--text-secondary)]">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {label}
      </div>
      <p
        className={`mt-1.5 text-lg font-bold ${accent ?? "text-exeer-primary dark:text-[var(--text-primary)]"}`}
      >
        {value}
      </p>
    </div>
  );
}

export default function AttendanceMonthlyReportSection({
  report,
  isLoading = false,
}) {
  const { t } = useTranslation();

  const empty = !report || report.isEmpty;

  return (
    <section
      className="rounded-2xl border border-exeer-border bg-white p-5 shadow-sm dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]"
      aria-labelledby="attendance-report-heading"
    >
      <div className="mb-4 flex items-start gap-2">
        <CalendarDays
          className="mt-0.5 h-4 w-4 shrink-0 text-exeer-primary dark:text-[var(--text-primary)]"
          aria-hidden
        />
        <div>
          <h2
            id="attendance-report-heading"
            className="text-sm font-bold text-exeer-primary dark:text-[var(--text-primary)]"
          >
            {t("pages.mobile.attendance.reportTitle")}
          </h2>
          <p className="mt-0.5 text-xs text-exeer-muted dark:text-[var(--text-secondary)]">
            {report?.monthLabel
              ? t("pages.mobile.attendance.reportMonth", {
                  month: report.monthLabel,
                })
              : t("pages.mobile.attendance.reportSubtitle")}
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="py-4 text-center text-sm text-exeer-muted">{t("common.loading")}</p>
      ) : empty ? (
        <p className="rounded-xl border border-dashed border-exeer-border px-4 py-8 text-center text-sm text-exeer-muted dark:border-[var(--border-color)]">
          {t("pages.mobile.attendance.reportEmpty")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <ReportStat
            icon={UserCheck}
            label={t("pages.mobile.attendance.presentCount")}
            value={report.presentCount}
            accent="text-emerald-700 dark:text-emerald-400"
          />
          <ReportStat
            icon={UserX}
            label={t("pages.mobile.attendance.absentCount")}
            value={report.absentCount}
            accent="text-rose-700 dark:text-rose-400"
          />
          <ReportStat
            icon={CalendarDays}
            label={t("pages.mobile.attendance.leaveCount")}
            value={report.leaveCount}
          />
          <ReportStat
            icon={Timer}
            label={t("pages.mobile.attendance.totalDelay")}
            value={
              report.totalDelay > 0
                ? t("pages.mobile.attendance.delayMinutes", {
                    count: report.totalDelay,
                  })
                : t("pages.mobile.attendance.noDelay")
            }
            accent={
              report.totalDelay > 0
                ? "text-amber-700 dark:text-amber-400"
                : "text-emerald-700 dark:text-emerald-400"
            }
          />
        </div>
      )}

      {!isLoading && !empty ? (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-exeer-muted dark:text-[var(--text-secondary)]">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
          {t("pages.mobile.attendance.reportHint", { count: report.recordCount })}
        </p>
      ) : null}
    </section>
  );
}
